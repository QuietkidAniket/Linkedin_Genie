import axios from 'axios';
import { GraphData, GraphMetrics, QueryResult } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const uploadCSV = async (formData: FormData) => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const buildGraph = async (): Promise<{ graph: GraphData; metrics: GraphMetrics }> => {
  const response = await api.get('/graph');
  return response.data;
};

export const queryGraph = async (query: string): Promise<QueryResult> => {
  const response = await api.post('/query', { q: query });
  return response.data;
};

export const getNodeDetails = async (nodeId: string) => {
  const response = await api.get(`/node/${nodeId}`);
  return response.data;
};

export const getMetrics = async (): Promise<GraphMetrics> => {
  const response = await api.get('/metrics');
  return response.data;
};

export const getShortestPath = async (sourceId: string, targetId: string) => {
  const response = await api.get(`/shortest-path/${sourceId}/${targetId}`);
  return response.data;
};

export const getNodeSubgraph = async (nodeId: string, depth: number = 1) => {
  const response = await api.get(`/subgraph/${nodeId}?depth=${depth}`);
  return response.data;
};

// Mock data for development
export const mockGraphData: GraphData = {
  nodes: [
    {
      data: {
        id: '1',
        label: 'John Smith',
        company: 'Google',
        position: 'Software Engineer',
        location: 'San Francisco',
        degree: 8,
        betweenness: 0.15,
        community: 0
      }
    },
    {
      data: {
        id: '2',
        label: 'Sarah Johnson',
        company: 'Microsoft',
        position: 'Product Manager',
        location: 'Seattle',
        degree: 6,
        betweenness: 0.12,
        community: 1
      }
    },
    {
      data: {
        id: '3',
        label: 'Mike Chen',
        company: 'Google',
        position: 'Data Scientist',
        location: 'San Francisco',
        degree: 5,
        betweenness: 0.08,
        community: 0
      }
    }
  ],
  edges: [
    {
      data: {
        source: '1',
        target: '3',
        weight: 4,
        attributes: ['company', 'location']
      }
    },
    {
      data: {
        source: '1',
        target: '2',
        weight: 2,
        attributes: ['position']
      }
    }
  ]
};

export const mockMetrics: GraphMetrics = {
  total_nodes: 150,
  total_edges: 320,
  avg_degree: 4.3,
  density: 0.028,
  communities: 8,
  top_companies: [
    { name: 'Google', count: 25 },
    { name: 'Microsoft', count: 18 },
    { name: 'Apple', count: 15 },
    { name: 'Amazon', count: 12 },
    { name: 'Meta', count: 10 }
  ],
  top_positions: [
    { name: 'engineer', count: 45 },
    { name: 'manager', count: 32 },
    { name: 'director', count: 18 },
    { name: 'analyst', count: 15 },
    { name: 'consultant', count: 12 }
  ],
  top_connectors: [
    { id: '1', name: 'John Smith', degree: 15 },
    { id: '2', name: 'Sarah Johnson', degree: 12 },
    { id: '3', name: 'Mike Chen', degree: 10 }
  ],
  centrality_leaders: [
    { id: '1', name: 'John Smith', betweenness: 0.25 },
    { id: '2', name: 'Sarah Johnson', betweenness: 0.18 },
    { id: '3', name: 'Mike Chen', betweenness: 0.15 }
  ]
};