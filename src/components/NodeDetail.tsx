import React, { useState } from 'react';
import { User, Building, MapPin, Calendar, Mail, Eye, EyeOff, Network, TrendingUp, Route, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData, GraphData } from '../types';
import { format } from 'date-fns';
import { getShortestPath, getNodeSubgraph } from '../services/api';
import toast from 'react-hot-toast';

interface NodeDetailProps {
  node: NodeData | null;
  graphData: GraphData | null;
  onShowPath?: (pathData: any) => void;
  onShowSubgraph?: (subgraphData: any) => void;
}

const NodeDetail: React.FC<NodeDetailProps> = ({ node, graphData, onShowPath, onShowSubgraph }) => {
  const [showEmail, setShowEmail] = useState(false);
  const [showNeighbors, setShowNeighbors] = useState(false);
  const [targetNodeId, setTargetNodeId] = useState('');
  const [subgraphDepth, setSubgraphDepth] = useState(1);

  if (!node) {
    return (
      <div className="card h-fit">
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a node to view details</p>
        </div>
      </div>
    );
  }

  // Find connected nodes
  const connectedNodes = graphData?.edges
    .filter(edge => edge.data.source === node.id || edge.data.target === node.id)
    .map(edge => {
      const connectedId = edge.data.source === node.id ? edge.data.target : edge.data.source;
      return {
        node: graphData.nodes.find(n => n.data.id === connectedId)?.data,
        weight: edge.data.weight,
        attributes: edge.data.attributes
      };
    })
    .filter(conn => conn.node)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0)) || [];

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const getConnectionStrength = (weight: number) => {
    if (weight >= 4) return { label: 'Very Strong', color: 'text-green-600', bg: 'bg-green-100' };
    if (weight >= 3) return { label: 'Strong', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (weight >= 2) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Weak', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const handleFindPath = async () => {
    if (!targetNodeId || !node) return;
    
    try {
      const pathData = await getShortestPath(node.id, targetNodeId);
      if (pathData.path.exists) {
        onShowPath?.(pathData.path);
        toast.success(`Found path with ${pathData.path.length} steps`);
      } else {
        toast.error('No path found between these nodes');
      }
    } catch (error) {
      toast.error('Failed to find path');
    }
  };

  const handleShowSubgraph = async () => {
    if (!node) return;
    
    try {
      const subgraphData = await getNodeSubgraph(node.id, subgraphDepth);
      onShowSubgraph?.(subgraphData.subgraph);
      toast.success(`Showing ${subgraphDepth}-hop neighborhood`);
    } catch (error) {
      toast.error('Failed to get subgraph');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card h-fit"
    >
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-12 h-12 bg-linkedin-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{node.label}</h3>
          <p className="text-sm text-gray-600 truncate">{node.position || 'Unknown Position'}</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-3 mb-6">
        {node.company && (
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{node.company}</span>
          </div>
        )}
        
        {node.location && (
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{node.location}</span>
          </div>
        )}
        
        {node.connected_on && (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Connected {formatDate(node.connected_on)}</span>
          </div>
        )}

        {node.email && (
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex items-center space-x-2 flex-1">
              {showEmail ? (
                <span className="text-sm text-gray-700">{node.email}</span>
              ) : (
                <span className="text-sm text-gray-500">••••••@••••••.com</span>
              )}
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title={showEmail ? 'Hide email' : 'Show email'}
              >
                {showEmail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Network Metrics */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-3">Network Metrics</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{node.degree || 0}</div>
            <div className="text-xs text-gray-600">Connections</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {node.betweenness ? (node.betweenness * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-gray-600">Centrality</div>
          </div>
          {node.community !== undefined && (
            <div className="text-center p-3 bg-gray-50 rounded-lg col-span-2">
              <div className="text-lg font-semibold text-gray-900">Community {node.community}</div>
              <div className="text-xs text-gray-600">Network Cluster</div>
            </div>
          )}
        </div>
      </div>

      {/* Connected Nodes */}
      {connectedNodes.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowNeighbors(!showNeighbors)}
            className="flex items-center justify-between w-full mb-3"
          >
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <Network className="w-4 h-4" />
              <span>Connected To ({connectedNodes.length})</span>
            </h4>
            <TrendingUp className={`w-4 h-4 text-gray-500 transition-transform ${showNeighbors ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showNeighbors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 max-h-64 overflow-y-auto"
              >
                {connectedNodes.slice(0, 10).map((connection, index) => {
                  const strength = getConnectionStrength(connection.weight || 0);
                  return (
                    <div key={index} className="p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {connection.node?.label}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${strength.bg} ${strength.color}`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {connection.node?.company} • {connection.node?.position}
                      </div>
                      {connection.attributes && connection.attributes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {connection.attributes.map((attr, attrIndex) => (
                            <span key={attrIndex} className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                              {attr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {connectedNodes.length > 10 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    ... and {connectedNodes.length - 10} more connections
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Path Finding */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Route className="w-4 h-4" />
          <span>Find Path</span>
        </h4>
        <div className="space-y-2">
          <select
            value={targetNodeId}
            onChange={(e) => setTargetNodeId(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Select target node...</option>
            {graphData?.nodes
              .filter(n => n.data.id !== node?.id)
              .slice(0, 50)
              .map(n => (
                <option key={n.data.id} value={n.data.id}>
                  {n.data.label}
                </option>
              ))}
          </select>
          <button
            onClick={handleFindPath}
            disabled={!targetNodeId}
            className="btn-primary text-sm w-full disabled:opacity-50"
          >
            Find Shortest Path
          </button>
        </div>
      </div>

      {/* Subgraph */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span>Show Neighborhood</span>
        </h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Depth:</label>
            <select
              value={subgraphDepth}
              onChange={(e) => setSubgraphDepth(parseInt(e.target.value))}
              className="input-field text-sm flex-1"
            >
              <option value={1}>1 hop</option>
              <option value={2}>2 hops</option>
              <option value={3}>3 hops</option>
            </select>
          </div>
          <button
            onClick={handleShowSubgraph}
            className="btn-primary text-sm w-full"
          >
            Show Subgraph
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NodeDetail;