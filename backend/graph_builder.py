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
from io import StringIO
import math

logger = logging.getLogger(__name__)

class GraphBuilder:
    def __init__(self):
        self.default_weights = {
            'company_weight': 3,
            'school_weight': 2,
            'location_weight': 1,
            'position_weight': 1,
            'threshold': 1,
            'fuzzy_matching': True,
            'similarity_threshold': 85
        }

    def process_csv(self, csv_content: str, column_mapping: Dict, settings: Dict) -> Tuple[List[Dict], List[Dict], Dict]:
        """Process CSV content and build graph"""
        try:
            # The LinkedIn CSV export has 2 header rows, we skip them.
            df = pd.read_csv(StringIO(csv_content), header=2)
            logger.info(f"Loaded CSV with {len(df)} rows and columns: {df.columns.tolist()}")

            nodes = self._create_nodes(df, column_mapping)
            logger.info(f"Created {len(nodes)} nodes")
            
            inference_settings = {**self.default_weights, **settings}
            
            edges = self._infer_edges(nodes, inference_settings)
            logger.info(f"Inferred {len(edges)} edges")
            
            metrics = self._compute_metrics(nodes, edges)
            
            return nodes, edges, metrics
            
        except Exception as e:
            logger.error(f"Error processing CSV: {str(e)}")
            raise

    def _create_nodes(self, df: pd.DataFrame, column_mapping: Dict) -> List[Dict]:
        """Create nodes from DataFrame using column names for robustness."""
        nodes = []
        
        if not column_mapping:
            logger.info("No column mapping provided, attempting auto-detection.")
            # Create a reverse map of column name to index for easy lookup
            col_to_idx = {col.lower().strip(): i for i, col in enumerate(df.columns)}
            # Auto-detect based on common LinkedIn export names
            column_mapping = {
                str(col_to_idx.get(field.replace('_', ' ').lower(), -1)): field
                for field in ['first_name', 'last_name', 'company', 'position', 'location', 'school', 'connected_on', 'email']
            }
        
        # Filter out mappings that weren't found (index is -1)
        header_map = {field: df.columns[int(idx)] for idx, field in column_mapping.items() if idx != '-1' and int(idx) < len(df.columns)}
        logger.info(f"Using header map: {header_map}")

        for idx, row in df.iterrows():
            node_data = {'id': str(idx), 'label': '', 'raw': row.to_dict()}

            first_name = str(row.get(header_map.get('first_name', ''), '')).strip()
            last_name = str(row.get(header_map.get('last_name', ''), '')).strip()

            for field, col_name in header_map.items():
                if field in ['email', 'company', 'position', 'location', 'school', 'connected_on']:
                    node_data[field] = str(row[col_name]).strip() if pd.notna(row.get(col_name)) else ''

            if first_name or last_name:
                node_data['label'] = f"{first_name} {last_name}".strip()
            elif node_data.get('company'):
                node_data['label'] = f"Contact at {node_data['company']}"
            else:
                node_data['label'] = f"Contact {idx + 1}"

            if node_data.get('company'):
                node_data['company_normalized'] = self._normalize_company(node_data['company'])
            if node_data.get('position'):
                node_data['position_tokens'] = self._extract_position_tokens(node_data['position'])
            if node_data.get('location'):
                node_data['location_normalized'] = self._normalize_location(node_data['location'])
            
            nodes.append({'data': node_data})
        
        return nodes

    def _normalize_company(self, company: str) -> str:
        if not company: return ''
        normalized = company.lower().strip()
        suffixes = ['inc', 'inc.', 'llc', 'ltd', 'ltd.', 'corp', 'corp.', 'co', 'co.', 'pvt', 'pvt.', 'limited']
        for suffix in suffixes:
            if normalized.endswith(f' {suffix}'):
                normalized = normalized[:-len(suffix)-1].strip()
        normalized = re.sub(r'[^\w\s]', '', normalized)
        company_mappings = {'google llc': 'google', 'microsoft corporation': 'microsoft', 'apple inc': 'apple', 'amazon com': 'amazon', 'meta platforms': 'meta', 'facebook inc': 'meta'}
        return company_mappings.get(normalized, normalized)

    def _normalize_location(self, location: str) -> str:
        if not location: return ''
        normalized = location.lower().strip()
        location_mappings = {'sf': 'san francisco', 'bay area': 'san francisco', 'nyc': 'new york', 'new york city': 'new york', 'blr': 'bangalore', 'bengaluru': 'bangalore', 'mumbai': 'mumbai', 'bombay': 'mumbai'}
        return location_mappings.get(normalized, normalized)

    def _extract_position_tokens(self, position: str) -> List[str]:
        if not position: return []
        tokens = re.findall(r'\b\w+\b', position.lower())
        stop_words = {'and', 'the', 'of', 'at', 'in', 'for', 'with', 'by', 'to', 'a', 'an', 'is', 'are', 'was', 'were'}
        tokens = [token for token in tokens if len(token) > 2 and token not in stop_words]
        synonym_map = {'swe': 'engineer', 'dev': 'developer', 'mgr': 'manager', 'sr': 'senior', 'jr': 'junior', 'vp': 'vice president', 'cto': 'chief technology officer', 'ceo': 'chief executive officer'}
        tokens = [synonym_map.get(token, token) for token in tokens]
        return list(set(tokens))

    def _infer_edges(self, nodes: List[Dict], settings: Dict) -> List[Dict]:
        edges, weights = [], defaultdict(lambda: {'weight': 0, 'attributes': []})
        company_index, school_index, location_index, token_index = defaultdict(list), defaultdict(list), defaultdict(list), defaultdict(list)

        for node in nodes:
            node_id = node['data']['id']
            if company := node['data'].get('company_normalized'):
                if company.strip(): company_index[company].append(node_id)
            if school := node['data'].get('school'):
                if school.strip(): school_index[school.lower().strip()].append(node_id)
            if location := node['data'].get('location_normalized'):
                if location.strip(): location_index[location].append(node_id)
            if tokens := node['data'].get('position_tokens', []):
                for token in tokens:
                    token_index[token].append(node_id)

        self._add_weights_from_index(company_index, weights, settings['company_weight'], 'company')
        self._add_weights_from_index(school_index, weights, settings['school_weight'], 'school')
        self._add_weights_from_index(location_index, weights, settings['location_weight'], 'location')
        self._add_weights_from_index(token_index, weights, settings['position_weight'], 'position')
        
        if settings.get('fuzzy_matching', False): self._add_fuzzy_company_weights(nodes, weights, settings)
        self._add_semantic_position_weights(nodes, weights, settings)
        
        for (node_a, node_b), weight_info in weights.items():
            if weight_info['weight'] >= settings['threshold']:
                edges.append({'data': {'source': node_a, 'target': node_b, 'weight': round(weight_info['weight'], 2), 'attributes': list(set(weight_info['attributes']))}})
        return edges

    def _add_weights_from_index(self, index: Dict, weights: Dict, weight: float, attribute: str):
        for group in index.values():
            if len(group) < 2: continue
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    node_a, node_b = sorted([group[i], group[j]])
                    weights[(node_a, node_b)]['weight'] += weight
                    weights[(node_a, node_b)]['attributes'].append(attribute)

    def _add_fuzzy_company_weights(self, nodes: List[Dict], weights: Dict, settings: Dict):
        companies = defaultdict(list)
        for node in nodes:
            if company := node['data'].get('company_normalized', ''):
                companies[company].append(node['data']['id'])
        company_names = list(companies.keys())
        for i in range(len(company_names)):
            for j in range(i + 1, len(company_names)):
                company_a, company_b = company_names[i], company_names[j]
                if fuzz.ratio(company_a, company_b) >= settings.get('similarity_threshold', 85):
                    for node_a in companies[company_a]:
                        for node_b in companies[company_b]:
                            key = tuple(sorted([node_a, node_b]))
                            weights[key]['weight'] += settings['company_weight'] * 0.8
                            weights[key]['attributes'].append('company_fuzzy')

    def _add_semantic_position_weights(self, nodes: List[Dict], weights: Dict, settings: Dict):
        try:
            positions, node_ids = [], []
            for node in nodes:
                if position := node['data'].get('position', ''):
                    positions.append(position)
                    node_ids.append(node['data']['id'])
            if len(positions) < 2: return
            
            vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
            tfidf_matrix = vectorizer.fit_transform(positions)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            similar_pairs = np.argwhere(np.triu(similarity_matrix, k=1) > 0.3)
            for i, j in similar_pairs:
                key = tuple(sorted([node_ids[i], node_ids[j]]))
                weights[key]['weight'] += settings['position_weight'] * similarity_matrix[i, j] * 0.5
                weights[key]['attributes'].append('position_semantic')
        except Exception as e:
            logger.warning(f"Semantic position matching failed: {e}")

    def _clean_for_json(self, data:Any) -> Any:
        if isinstance(data, dict):
            return {key: self._clean_for_json(value) for key, value in data.items()}
        if isinstance(data, list):
            return [self._clean_for_json(item) for item in data]
        if isinstance(data, float) and not math.isfinite(data):
            return None
        if isinstance(data, np.generic):
            return self._clean_for_json(data.item())
        return data


    def _compute_metrics(self, nodes: List[Dict], edges: List[Dict]) -> Dict:
        try:
            G = nx.Graph()
            for node in nodes: G.add_node(node['data']['id'], **node['data'])
            for edge in edges: G.add_edge(edge['data']['source'], edge['data']['target'], weight=edge['data']['weight'])
            
            total_nodes, total_edges = len(nodes), len(edges)
            avg_degree = sum(d for _, d in G.degree()) / total_nodes if total_nodes > 0 else 0
            density = nx.density(G) if total_nodes > 1 else 0

            if total_edges > 0:
                degree_centrality = nx.degree_centrality(G)
                betweenness_centrality = nx.betweenness_centrality(G, weight='weight')
                try: eigenvector_centrality = nx.eigenvector_centrality(G, weight='weight', max_iter=1000)
                except (nx.PowerIterationFailedConvergence, nx.NetworkXError): eigenvector_centrality = {nid: 0.0 for nid in G.nodes()}
            else:
                degree_centrality, betweenness_centrality, eigenvector_centrality = {}, {}, {}

            for node in nodes:
                nid = node['data']['id']
                node['data'].update({
                    'degree': G.degree(nid) if nid in G else 0,
                    'degree_centrality': degree_centrality.get(nid, 0),
                    'betweenness': betweenness_centrality.get(nid, 0),
                    'eigenvector': eigenvector_centrality.get(nid, 0)
                })

            if total_edges > 0:
                try:
                    import community as community_louvain
                    partition = community_louvain.best_partition(G, weight='weight')
                    communities = len(set(partition.values()))
                except ImportError:
                    components = list(nx.connected_components(G))
                    communities = len(components)
                    partition = {nid: i for i, comp in enumerate(components) for nid in comp}
            else:
                communities = total_nodes
                partition = {node['data']['id']: i for i, node in enumerate(nodes)}
            
            for node in nodes: node['data']['community'] = partition.get(node['data']['id'], -1)

            companies = Counter(n['data']['company'] for n in nodes if n['data'].get('company'))
            positions = Counter(token for n in nodes for token in n['data'].get('position_tokens', []))
            locations = Counter(n['data']['location'] for n in nodes if n['data'].get('location'))

            metrics_data = {
                'total_nodes': total_nodes, 'total_edges': total_edges, 'avg_degree': avg_degree, 'density': density,
                'communities': communities,
                'top_companies': [{'name': name, 'count': count} for name, count in companies.most_common(20)],
                'top_positions': [{'name': name, 'count': count} for name, count in positions.most_common(15)],
                'top_locations': [{'name': name, 'count': count} for name, count in locations.most_common(15)],
                'top_connectors': sorted([{'id': n['data']['id'], 'name': n['data']['label'], 'degree': n['data']['degree']} for n in nodes], key=lambda x: x['degree'], reverse=True)[:10],
                'centrality_leaders': sorted([{'id': n['data']['id'], 'name': n['data']['label'], 'betweenness': n['data']['betweenness']} for n in nodes], key=lambda x: x['betweenness'], reverse=True)[:10],
                'influence_leaders': sorted([{'id': n['data']['id'], 'name': n['data']['label'], 'eigenvector': n['data']['eigenvector']} for n in nodes], key=lambda x: x['eigenvector'], reverse=True)[:10]
            }
            return self._clean_for_json(metrics_data)
        except Exception as e:
            logger.error(f"Error computing metrics: {str(e)}")
            return self._clean_for_json({'total_nodes': len(nodes), 'total_edges': len(edges)})
    
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

