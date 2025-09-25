export interface NodeData {
  id: string;
  label: string;
  company?: string;
  position?: string;
  location?: string;
  email?: string;
  connected_on?: string;
  degree?: number;
  betweenness?: number;
  eigenvector?: number;
  community?: number;
  raw?: any;
}

export interface EdgeData {
  source: string;
  target: string;
  weight: number;
  attributes?: string[];
}

export interface CytoscapeNode {
  data: NodeData;
}

export interface CytoscapeEdge {
  data: EdgeData;
}

export interface GraphData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export interface FilterOptions {
  companies?: string[];
  positions?: string[];
  location?: string;
  min_degree?: number;
  date_from?: string;
  date_to?: string;
  explain?: string;
}

export interface GraphMetrics {
  total_nodes: number;
  total_edges: number;
  avg_degree: number;
  density: number;
  communities: number;
  top_companies: Array<{ name: string; count: number }>;
  top_positions: Array<{ name: string; count: number }>;
  top_connectors: Array<{ id: string; name: string; degree: number }>;
  centrality_leaders: Array<{ id: string; name: string; betweenness: number }>;
}

export interface ColumnMapping {
  [key: string]: string;
}

export interface InferenceSettings {
  company_weight: number;
  school_weight: number;
  location_weight: number;
  position_weight: number;
  threshold: number;
  fuzzy_matching: boolean;
  similarity_threshold: number;
}

export interface QueryResult {
  filter: FilterOptions;
  explain: string;
  graph: GraphData;
}