import React, { useState } from 'react';
import { User, Building, MapPin, Calendar, Mail, Eye, EyeOff, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData, GraphData } from '../types';
import { format } from 'date-fns';

interface NodeDetailProps {
  node: NodeData | null;
  graphData: GraphData | null;
}

const NodeDetail: React.FC<NodeDetailProps> = ({ node, graphData }) => {
  const [showEmail, setShowEmail] = useState(false);
  const [showNeighbors, setShowNeighbors] = useState(true);

  if (!node) {
    return (
      <div className="card h-fit sticky top-24">
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a connection to view details</p>
        </div>
      </div>
    );
  }

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
      return format(new Date(dateString), 'MMM dd, yyyy');
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card h-fit sticky top-24"
    >
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-12 h-12 bg-linkedin-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{node.label}</h3>
          <p className="text-sm text-gray-600">{node.position || 'Unknown Position'}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {node.company && <div className="flex items-center text-sm"><Building className="w-4 h-4 mr-2 text-gray-400" />{node.company}</div>}
        {node.location && <div className="flex items-center text-sm"><MapPin className="w-4 h-4 mr-2 text-gray-400" />{node.location}</div>}
        {node.connected_on && <div className="flex items-center text-sm"><Calendar className="w-4 h-4 mr-2 text-gray-400" />Connected {formatDate(node.connected_on)}</div>}
        {node.email && (
          <div className="flex items-center space-x-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-1">
              {showEmail ? <span>{node.email}</span> : <span>••••••@••••••.com</span>}
              <button onClick={() => setShowEmail(!showEmail)} title={showEmail ? 'Hide' : 'Show'}>
                {showEmail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-3">Network Metrics</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{node.degree || 0}</div><div className="text-xs text-gray-500">Connections</div></div>
          <div className="p-3 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{(node.betweenness || 0).toFixed(3)}</div><div className="text-xs text-gray-500">Centrality</div></div>
        </div>
      </div>

      {connectedNodes.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowNeighbors(!showNeighbors)}
            className="flex items-center justify-between w-full mb-3 font-medium text-gray-900"
          >
            <div className="flex items-center space-x-2"><Network className="w-4 h-4" /><span>Inferred Connections ({connectedNodes.length})</span></div>
            {showNeighbors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showNeighbors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 max-h-60 overflow-y-auto pr-1"
              >
                {connectedNodes.map((connection, index) => {
                  const strength = getConnectionStrength(connection.weight || 0);
                  return (
                    <div key={index} className="p-2 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{connection.node?.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${strength.bg} ${strength.color}`}>{strength.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{connection.node?.position}</p>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default NodeDetail;