import React from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Users, Network, TrendingUp, Award, Building } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { GraphMetrics } from '../types';

interface MetricsPanelProps {
  metrics: GraphMetrics;
  onClose: () => void;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, onClose }) => {
  const COLORS = ['#0077b5', '#00a0dc', '#40e0d0', '#87ceeb', '#4682b4', '#5f9ea0', '#6495ed', '#7b68ee'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-linkedin-500 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Network Analytics</h2>
              <p className="text-gray-600">Comprehensive insights into your professional network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Connections</p>
                  <p className="text-2xl font-bold">{metrics.total_nodes.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Inferred Links</p>
                  <p className="text-2xl font-bold">{metrics.total_edges.toLocaleString()}</p>
                </div>
                <Network className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Avg Connections</p>
                  <p className="text-2xl font-bold">{metrics.avg_degree.toFixed(1)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Communities</p>
                  <p className="text-2xl font-bold">{metrics.communities}</p>
                </div>
                <Award className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Companies Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Building className="w-5 h-5 text-gray-600" />
                <span>Top Companies</span>
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.top_companies.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0077b5" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Positions Pie Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span>Position Distribution</span>
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.top_positions.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {metrics.top_positions.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Connectors */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Network className="w-5 h-5 text-gray-600" />
                <span>Top Connectors</span>
              </h3>
              <div className="space-y-3">
                {metrics.top_connectors.slice(0, 8).map((connector, index) => (
                  <div key={connector.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-linkedin-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{connector.name}</p>
                        <p className="text-sm text-gray-600">{connector.degree} connections</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-linkedin-500 h-2 rounded-full" 
                          style={{ width: `${(connector.degree / metrics.top_connectors[0].degree) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Centrality Leaders */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span>Influence Leaders</span>
              </h3>
              <div className="space-y-3">
                {metrics.centrality_leaders.slice(0, 8).map((leader, index) => (
                  <div key={leader.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{leader.name}</p>
                        <p className="text-sm text-gray-600">
                          {(leader.betweenness * 100).toFixed(2)}% centrality
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${(leader.betweenness / metrics.centrality_leaders[0].betweenness) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Network Statistics */}
          <div className="mt-8 card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{(metrics.density * 100).toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Network Density</div>
                <div className="text-xs text-gray-500 mt-1">
                  How interconnected your network is
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(metrics.total_edges / metrics.total_nodes).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Edges per Node</div>
                <div className="text-xs text-gray-500 mt-1">
                  Average inferred connections per person
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{metrics.communities}</div>
                <div className="text-sm text-gray-600">Network Communities</div>
                <div className="text-xs text-gray-500 mt-1">
                  Distinct clusters in your network
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MetricsPanel;