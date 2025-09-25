import pandas as pd
import networkx as nx
from collections import defaultdict, Counter
import re
from rapidfuzz import fuzz
from typing import Dict, List, Tuple, Any, Optional
import logging
import json
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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
            
            # Normalize location
            if node_data.get('location'):
                node_data['location_normalized'] = self._normalize_location(node_data['location'])
            
            nodes.append({'data': node_data})
        
        return nodes
    
    def _normalize_company(self, company: str) -> str:
        """Normalize company name for matching"""
        if not company:
            return ''
        
        # Convert to lowercase
        normalized = company.lower().strip()
        
        # Remove common suffixes
        suffixes = ['inc', 'inc.', 'llc', 'ltd', 'ltd.', 'corp', 'corp.', 'co', 'co.', 'pvt', 'pvt.', 'limited']
        for suffix in suffixes:
            if normalized.endswith(f' {suffix}'):
                normalized = normalized[:-len(suffix)-1].strip()
        
        # Remove special characters
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        # Handle common company name variations
        company_mappings = {
            'google llc': 'google',
            'microsoft corporation': 'microsoft',
            'apple inc': 'apple',
            'amazon com': 'amazon',
            'meta platforms': 'meta',
            'facebook inc': 'meta'
        }
        
        return company_mappings.get(normalized, normalized)
    
    def _normalize_location(self, location: str) -> str:
        """Normalize location for matching"""
        if not location:
            return ''
        
        normalized = location.lower().strip()
        
        # Handle common location variations
        location_mappings = {
            'sf': 'san francisco',
            'bay area': 'san francisco',
            'nyc': 'new york',
            'new york city': 'new york',
            'blr': 'bangalore',
            'bengaluru': 'bangalore',
            'mumbai': 'mumbai',
            'bombay': 'mumbai'
        }
        
        return location_mappings.get(normalized, normalized)
    
    def _extract_position_tokens(self, position: str) -> List[str]:
        """Extract meaningful tokens from position string"""
        if not position:
            return []
        
        # Convert to lowercase and split
        tokens = re.findall(r'\b\w+\b', position.lower())
        
        # Filter out common words
        stop_words = {'and', 'the', 'of', 'at', 'in', 'for', 'with', 'by', 'to', 'a', 'an', 'is', 'are', 'was', 'were'}
        tokens = [token for token in tokens if len(token) > 2 and token not in stop_words]
        
        # Map common synonyms
        synonym_map = {
            'swe': 'engineer',
            'dev': 'developer',
            'mgr': 'manager',
            'sr': 'senior',
            'jr': 'junior',
            'vp': 'vice president',
            'cto': 'chief technology officer',
            'ceo': 'chief executive officer'
        }
        
        tokens = [synonym_map.get(token, token) for token in tokens]
        
        return list(set(tokens))  # Remove duplicates
    
    def _infer_edges(self, nodes: List[Dict], settings: Dict) -> List[Dict]:
        """Infer edges between nodes based on shared attributes"""
        edges = []
        weights = defaultdict(lambda: {'weight': 0, 'attributes': []})
        
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
            location = node['data'].get('location_normalized', '')
            if location:
                location_index[location].append(node_id)
            
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
        
        # Add semantic similarity for positions
        self._add_semantic_position_weights(nodes, weights, settings)
        
        # Create edges based on threshold
        threshold = settings['threshold']
        for (node_a, node_b), weight_info in weights.items():
            if weight_info['weight'] >= threshold:
                edges.append({
                    'data': {
                        'source': node_a,
                        'target': node_b,
                        'weight': round(weight_info['weight'], 2),
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
                            
                            # Reduced weight for fuzzy matches
                            fuzzy_weight = settings['company_weight'] * (similarity / 100) * 0.8
                            weights[key]['weight'] += fuzzy_weight
                            weights[key]['attributes'].append('company_fuzzy')
    
    def _add_semantic_position_weights(self, nodes: List[Dict], weights: Dict, settings: Dict):
        """Add weights for semantically similar positions using TF-IDF"""
        try:
            positions = []
            node_positions = {}
            
            for node in nodes:
                position = node['data'].get('position', '')
                if position:
                    positions.append(position)
                    node_positions[node['data']['id']] = position
            
            if len(positions) < 2:
                return
            
            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
            tfidf_matrix = vectorizer.fit_transform(positions)
            
            # Calculate cosine similarity
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # Add weights for similar positions
            position_list = list(node_positions.items())
            for i in range(len(position_list)):
                for j in range(i + 1, len(position_list)):
                    node_a_id, _ = position_list[i]
                    node_b_id, _ = position_list[j]
                    
                    similarity = similarity_matrix[i][j]
                    
                    if similarity > 0.3:  # Threshold for semantic similarity
                        key = tuple(sorted([node_a_id, node_b_id]))
                        semantic_weight = settings['position_weight'] * similarity * 0.5
                        weights[key]['weight'] += semantic_weight
                        weights[key]['attributes'].append('position_semantic')
                        
        except Exception as e:
            logger.warning(f"Semantic position matching failed: {e}")
    
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
            eigenvector_centrality = {}
            
            try:
                eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=1000)
            except:
                # Fallback if eigenvector centrality fails
                eigenvector_centrality = {node: 0 for node in G.nodes()}
            
            # Update node data with metrics
            for node in nodes:
                node_id = node['data']['id']
                node['data']['degree'] = G.degree(node_id) if node_id in G else 0
                node['data']['betweenness'] = betweenness_centrality.get(node_id, 0)
                node['data']['degree_centrality'] = degree_centrality.get(node_id, 0)
                node['data']['eigenvector'] = eigenvector_centrality.get(node_id, 0)
            
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
            locations = Counter()
            
            for node in nodes:
                company = node['data'].get('company', '')
                if company:
                    companies[company] += 1
                
                position_tokens = node['data'].get('position_tokens', [])
                for token in position_tokens:
                    positions[token] += 1
                
                location = node['data'].get('location', '')
                if location:
                    locations[location] += 1
            
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
            
            influence_leaders = sorted(
                [{'id': node['data']['id'], 'name': node['data']['label'], 'eigenvector': node['data']['eigenvector']} 
                 for node in nodes],
                key=lambda x: x['eigenvector'],
                reverse=True
            )[:10]
            
            return {
                'total_nodes': total_nodes,
                'total_edges': total_edges,
                'avg_degree': round(avg_degree, 2),
                'density': round(density, 4),
                'communities': communities,
                'top_companies': [{'name': name, 'count': count} for name, count in companies.most_common(20)],
                'top_positions': [{'name': name, 'count': count} for name, count in positions.most_common(15)],
                'top_locations': [{'name': name, 'count': count} for name, count in locations.most_common(15)],
                'top_connectors': top_connectors,
                'centrality_leaders': centrality_leaders,
                'influence_leaders': influence_leaders
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
                'top_locations': [],
                'top_connectors': [],
                'centrality_leaders': [],
                'influence_leaders': []
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
                    # Handle various date formats
                    if 'T' in date_str:
                        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    else:
                        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    
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
    
    def find_shortest_path(self, nodes: List[Dict], edges: List[Dict], source_id: str, target_id: str) -> Dict:
        """Find shortest path between two nodes"""
        try:
            # Create NetworkX graph
            G = nx.Graph()
            
            # Add nodes
            for node in nodes:
                G.add_node(node['data']['id'])
            
            # Add edges
            for edge in edges:
                G.add_edge(edge['data']['source'], edge['data']['target'])
            
            # Find shortest path
            if source_id in G and target_id in G:
                try:
                    path = nx.shortest_path(G, source_id, target_id)
                    path_length = len(path) - 1
                    
                    # Get path nodes and edges
                    path_nodes = [node for node in nodes if node['data']['id'] in path]
                    path_edges = []
                    
                    for i in range(len(path) - 1):
                        for edge in edges:
                            if ((edge['data']['source'] == path[i] and edge['data']['target'] == path[i+1]) or
                                (edge['data']['source'] == path[i+1] and edge['data']['target'] == path[i])):
                                path_edges.append(edge)
                                break
                    
                    return {
                        'exists': True,
                        'length': path_length,
                        'nodes': path_nodes,
                        'edges': path_edges
                    }
                except nx.NetworkXNoPath:
                    return {'exists': False, 'reason': 'No path exists'}
            else:
                return {'exists': False, 'reason': 'One or both nodes not found'}
                
        except Exception as e:
            logger.error(f"Error finding shortest path: {e}")
            return {'exists': False, 'reason': str(e)}
    
    def get_node_subgraph(self, nodes: List[Dict], edges: List[Dict], node_id: str, depth: int = 1) -> Dict:
        """Get subgraph around a specific node"""
        try:
            # Create NetworkX graph
            G = nx.Graph()
            
            # Add nodes
            for node in nodes:
                G.add_node(node['data']['id'])
            
            # Add edges
            for edge in edges:
                G.add_edge(edge['data']['source'], edge['data']['target'])
            
            if node_id not in G:
                return {'nodes': [], 'edges': []}
            
            # Get nodes within specified depth
            subgraph_nodes = set([node_id])
            current_level = set([node_id])
            
            for _ in range(depth):
                next_level = set()
                for node in current_level:
                    neighbors = set(G.neighbors(node))
                    next_level.update(neighbors)
                    subgraph_nodes.update(neighbors)
                current_level = next_level - subgraph_nodes
                subgraph_nodes.update(current_level)
            
            # Filter nodes and edges
            filtered_nodes = [node for node in nodes if node['data']['id'] in subgraph_nodes]
            filtered_edges = [
                edge for edge in edges
                if edge['data']['source'] in subgraph_nodes and edge['data']['target'] in subgraph_nodes
            ]
            
            return {
                'nodes': filtered_nodes,
                'edges': filtered_edges
            }
            
        except Exception as e:
            logger.error(f"Error getting subgraph: {e}")
            return {'nodes': [], 'edges': []}