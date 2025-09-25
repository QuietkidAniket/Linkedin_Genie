import pandas as pd
import networkx as nx
from collections import defaultdict, Counter
import re
from rapidfuzz import fuzz
from typing import Dict, List, Tuple, Any, Optional
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class GraphBuilder:
    def __init__(self):
        self.default_weights = {
            'company_weight': 3,
            'school_weight': 2,
            'location_weight': 1,
            'position_weight': 1,
            'threshold': 2,
            'fuzzy_matching': True,
            'similarity_threshold': 85
        }
    
    def process_csv(self, csv_content: str, column_mapping: Dict, settings: Dict) -> Tuple[List[Dict], List[Dict], Dict]:
        """Process CSV content and build graph"""
        try:
            # Parse CSV
            df = pd.read_csv(pd.StringIO(csv_content))
            logger.info(f"Loaded CSV with {len(df)} rows and {len(df.columns)} columns")
            
            # Apply column mapping
            nodes = self._create_nodes(df, column_mapping)
            logger.info(f"Created {len(nodes)} nodes")
            
            # Merge settings with defaults
            inference_settings = {**self.default_weights, **settings}
            
            # Build edges
            edges = self._infer_edges(nodes, inference_settings)
            logger.info(f"Inferred {len(edges)} edges")
            
            # Compute metrics
            metrics = self._compute_metrics(nodes, edges)
            
            return nodes, edges, metrics
            
        except Exception as e:
            logger.error(f"Error processing CSV: {str(e)}")
            raise
    
    def _create_nodes(self, df: pd.DataFrame, column_mapping: Dict) -> List[Dict]:
        """Create nodes from DataFrame"""
        nodes = []
        
        for idx, row in df.iterrows():
            node_data = {
                'id': str(idx),
                'label': '',
                'raw': row.to_dict()
            }
            
            # Map columns
            first_name = ''
            last_name = ''
            
            for col_idx, canonical_field in column_mapping.items():
                col_idx = int(col_idx)
                if col_idx < len(df.columns):
                    value = str(row.iloc[col_idx]).strip() if pd.notna(row.iloc[col_idx]) else ''
                    
                    if canonical_field == 'first_name':
                        first_name = value
                    elif canonical_field == 'last_name':
                        last_name = value
                    elif canonical_field in ['email', 'company', 'position', 'location', 'school', 'connected_on']:
                        node_data[canonical_field] = value
            
            # Create label
            if first_name or last_name:
                node_data['label'] = f"{first_name} {last_name}".strip()
            elif node_data.get('company'):
                node_data['label'] = f"Contact at {node_data['company']}"
            else:
                node_data['label'] = f"Contact {idx + 1}"
            
            # Normalize company name
            if node_data.get('company'):
                node_data['company_normalized'] = self._normalize_company(node_data['company'])
            
            # Extract position tokens
            if node_data.get('position'):
                node_data['position_tokens'] = self._extract_position_tokens(node_data['position'])
            
            nodes.append({'data': node_data})
        
        return nodes
    
    def _normalize_company(self, company: str) -> str:
        """Normalize company name for matching"""
        if not company:
            return ''
        
        # Convert to lowercase
        normalized = company.lower().strip()
        
        # Remove common suffixes
        suffixes = ['inc', 'inc.', 'llc', 'ltd', 'ltd.', 'corp', 'corp.', 'co', 'co.', 'pvt', 'pvt.']
        for suffix in suffixes:
            if normalized.endswith(f' {suffix}'):
                normalized = normalized[:-len(suffix)-1].strip()
        
        # Remove special characters
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        return normalized
    
    def _extract_position_tokens(self, position: str) -> List[str]:
        """Extract meaningful tokens from position string"""
        if not position:
            return []
        
        # Convert to lowercase and split
        tokens = re.findall(r'\b\w+\b', position.lower())
        
        # Filter out common words
        stop_words = {'and', 'the', 'of', 'at', 'in', 'for', 'with', 'by', 'to', 'a', 'an'}
        tokens = [token for token in tokens if len(token) > 2 and token not in stop_words]
        
        # Map common synonyms
        synonym_map = {
            'swe': 'engineer',
            'dev': 'developer',
            'mgr': 'manager',
            'sr': 'senior',
            'jr': 'junior'
        }
        
        tokens = [synonym_map.get(token, token) for token in tokens]
        
        return list(set(tokens))  # Remove duplicates
    
    def _infer_edges(self, nodes: List[Dict], settings: Dict) -> List[Dict]:
        """Infer edges between nodes based on shared attributes"""
        edges = []
        weights = defaultdict(float)
        
        # Build indices for efficient lookup
        company_index = defaultdict(list)
        school_index = defaultdict(list)
        location_index = defaultdict(list)
        token_index = defaultdict(list)
        
        for node in nodes:
            node_id = node['data']['id']
            
            # Company index
            company = node['data'].get('company_normalized', '')
            if company:
                company_index[company].append(node_id)
            
            # School index
            school = node['data'].get('school', '')
            if school:
                school_normalized = school.lower().strip()
                school_index[school_normalized].append(node_id)
            
            # Location index
            location = node['data'].get('location', '')
            if location:
                location_normalized = location.lower().strip()
                location_index[location_normalized].append(node_id)
            
            # Position token index
            tokens = node['data'].get('position_tokens', [])
            for token in tokens:
                token_index[token].append(node_id)
        
        # Add weights for shared attributes
        self._add_weights_from_index(company_index, weights, settings['company_weight'], 'company')
        self._add_weights_from_index(school_index, weights, settings['school_weight'], 'school')
        self._add_weights_from_index(location_index, weights, settings['location_weight'], 'location')
        self._add_weights_from_index(token_index, weights, settings['position_weight'], 'position')
        
        # Handle fuzzy matching for companies
        if settings.get('fuzzy_matching', False):
            self._add_fuzzy_company_weights(nodes, weights, settings)
        
        # Create edges based on threshold
        threshold = settings['threshold']
        for (node_a, node_b), weight_info in weights.items():
            if weight_info['weight'] >= threshold:
                edges.append({
                    'data': {
                        'source': node_a,
                        'target': node_b,
                        'weight': weight_info['weight'],
                        'attributes': weight_info['attributes']
                    }
                })
        
        return edges
    
    def _add_weights_from_index(self, index: Dict, weights: Dict, weight: float, attribute: str):
        """Add weights for nodes sharing an attribute"""
        for group in index.values():
            if len(group) < 2:
                continue
            
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    node_a, node_b = sorted([group[i], group[j]])
                    key = (node_a, node_b)
                    
                    if key not in weights:
                        weights[key] = {'weight': 0, 'attributes': []}
                    
                    weights[key]['weight'] += weight
                    weights[key]['attributes'].append(attribute)
    
    def _add_fuzzy_company_weights(self, nodes: List[Dict], weights: Dict, settings: Dict):
        """Add weights for fuzzy company name matches"""
        companies = {}
        for node in nodes:
            company = node['data'].get('company_normalized', '')
            if company:
                if company not in companies:
                    companies[company] = []
                companies[company].append(node['data']['id'])
        
        company_names = list(companies.keys())
        similarity_threshold = settings.get('similarity_threshold', 85)
        
        for i in range(len(company_names)):
            for j in range(i + 1, len(company_names)):
                company_a, company_b = company_names[i], company_names[j]
                
                # Skip if already exact match
                if company_a == company_b:
                    continue
                
                # Calculate similarity
                similarity = fuzz.ratio(company_a, company_b)
                
                if similarity >= similarity_threshold:
                    # Add connections between all nodes from these companies
                    nodes_a = companies[company_a]
                    nodes_b = companies[company_b]
                    
                    for node_a in nodes_a:
                        for node_b in nodes_b:
                            key = tuple(sorted([node_a, node_b]))
                            
                            if key not in weights:
                                weights[key] = {'weight': 0, 'attributes': []}
                            
                            # Reduced weight for fuzzy matches
                            fuzzy_weight = settings['company_weight'] * (similarity / 100) * 0.8
                            weights[key]['weight'] += fuzzy_weight
                            weights[key]['attributes'].append('company_fuzzy')
    
    def _compute_metrics(self, nodes: List[Dict], edges: List[Dict]) -> Dict:
        """Compute network metrics"""
        try:
            # Create NetworkX graph
            G = nx.Graph()
            
            # Add nodes
            for node in nodes:
                G.add_node(node['data']['id'], **node['data'])
            
            # Add edges
            for edge in edges:
                G.add_edge(
                    edge['data']['source'],
                    edge['data']['target'],
                    weight=edge['data']['weight']
                )
            
            # Compute basic metrics
            total_nodes = len(nodes)
            total_edges = len(edges)
            avg_degree = sum(dict(G.degree()).values()) / total_nodes if total_nodes > 0 else 0
            density = nx.density(G) if total_nodes > 1 else 0
            
            # Compute centrality measures
            degree_centrality = nx.degree_centrality(G)
            betweenness_centrality = nx.betweenness_centrality(G)
            
            # Update node data with metrics
            for node in nodes:
                node_id = node['data']['id']
                node['data']['degree'] = G.degree(node_id) if node_id in G else 0
                node['data']['betweenness'] = betweenness_centrality.get(node_id, 0)
                node['data']['degree_centrality'] = degree_centrality.get(node_id, 0)
            
            # Detect communities
            try:
                import community as community_louvain
                partition = community_louvain.best_partition(G)
                communities = len(set(partition.values()))
                
                # Update nodes with community info
                for node in nodes:
                    node_id = node['data']['id']
                    node['data']['community'] = partition.get(node_id, 0)
            except ImportError:
                # Fallback to connected components
                communities = nx.number_connected_components(G)
                component_map = {}
                for i, component in enumerate(nx.connected_components(G)):
                    for node_id in component:
                        component_map[node_id] = i
                
                for node in nodes:
                    node_id = node['data']['id']
                    node['data']['community'] = component_map.get(node_id, 0)
            
            # Analyze companies and positions
            companies = Counter()
            positions = Counter()
            
            for node in nodes:
                company = node['data'].get('company', '')
                if company:
                    companies[company] += 1
                
                position_tokens = node['data'].get('position_tokens', [])
                for token in position_tokens:
                    positions[token] += 1
            
            # Top connectors and centrality leaders
            top_connectors = sorted(
                [{'id': node['data']['id'], 'name': node['data']['label'], 'degree': node['data']['degree']} 
                 for node in nodes],
                key=lambda x: x['degree'],
                reverse=True
            )[:10]
            
            centrality_leaders = sorted(
                [{'id': node['data']['id'], 'name': node['data']['label'], 'betweenness': node['data']['betweenness']} 
                 for node in nodes],
                key=lambda x: x['betweenness'],
                reverse=True
            )[:10]
            
            return {
                'total_nodes': total_nodes,
                'total_edges': total_edges,
                'avg_degree': avg_degree,
                'density': density,
                'communities': communities,
                'top_companies': [{'name': name, 'count': count} for name, count in companies.most_common(20)],
                'top_positions': [{'name': name, 'count': count} for name, count in positions.most_common(15)],
                'top_connectors': top_connectors,
                'centrality_leaders': centrality_leaders
            }
            
        except Exception as e:
            logger.error(f"Error computing metrics: {str(e)}")
            return {
                'total_nodes': len(nodes),
                'total_edges': len(edges),
                'avg_degree': 0,
                'density': 0,
                'communities': 1,
                'top_companies': [],
                'top_positions': [],
                'top_connectors': [],
                'centrality_leaders': []
            }
    
    def apply_filters(self, nodes: List[Dict], edges: List[Dict], filters: Dict) -> Tuple[List[Dict], List[Dict]]:
        """Apply filters to graph data"""
        filtered_nodes = nodes.copy()
        
        # Apply company filter
        if filters.get('companies'):
            filtered_nodes = [
                node for node in filtered_nodes
                if any(company.lower() in (node['data'].get('company', '').lower())
                      for company in filters['companies'])
            ]
        
        # Apply position filter
        if filters.get('positions'):
            filtered_nodes = [
                node for node in filtered_nodes
                if any(position.lower() in ' '.join(node['data'].get('position_tokens', [])).lower()
                      for position in filters['positions'])
            ]
        
        # Apply location filter
        if filters.get('location'):
            location_filter = filters['location'].lower()
            filtered_nodes = [
                node for node in filtered_nodes
                if location_filter in (node['data'].get('location', '').lower())
            ]
        
        # Apply minimum degree filter
        if filters.get('min_degree'):
            min_degree = filters['min_degree']
            filtered_nodes = [
                node for node in filtered_nodes
                if node['data'].get('degree', 0) >= min_degree
            ]
        
        # Apply date filters
        if filters.get('date_from') or filters.get('date_to'):
            date_from = filters.get('date_from')
            date_to = filters.get('date_to')
            
            def is_date_in_range(date_str):
                if not date_str:
                    return False
                try:
                    date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    if date_from and date_obj < datetime.fromisoformat(date_from):
                        return False
                    if date_to and date_obj > datetime.fromisoformat(date_to):
                        return False
                    return True
                except:
                    return False
            
            filtered_nodes = [
                node for node in filtered_nodes
                if is_date_in_range(node['data'].get('connected_on'))
            ]
        
        # Filter edges to only include those between remaining nodes
        node_ids = {node['data']['id'] for node in filtered_nodes}
        filtered_edges = [
            edge for edge in edges
            if edge['data']['source'] in node_ids and edge['data']['target'] in node_ids
        ]
        
        return filtered_nodes, filtered_edges