import axios from 'axios';
import { GraphData, GraphMetrics, QueryResult, NodeData } from '../types';

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

// Export API base URL for debugging
export { API_BASE_URL };
