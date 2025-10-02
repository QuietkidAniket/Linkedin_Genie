import React, { useState, useMemo } from 'react';
import { Search, Users, MapPin, Briefcase, Building2, TrendingUp, Mail, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphData, NodeData } from '../types';

interface ConnectionsListProps {
  data: GraphData;
  onNodeSelect: (node: NodeData | null) => void;
  selectedNode: NodeData | null;
}

type SortField = 'name' | 'company' | 'position' | 'location' | 'degree' | 'connected_on';
type SortOrder = 'asc' | 'desc';

const ConnectionsList: React.FC<ConnectionsListProps> = ({ data, onNodeSelect, selectedNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('degree');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredAndSortedConnections = useMemo(() => {
    let filtered = data.nodes.filter(node => {
      const searchLower = searchTerm.toLowerCase();
      return (
        node.data.label?.toLowerCase().includes(searchLower) ||
        node.data.company?.toLowerCase().includes(searchLower) ||
        node.data.position?.toLowerCase().includes(searchLower) ||
        node.data.location?.toLowerCase().includes(searchLower) ||
        node.data.email?.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      let aVal: any = a.data[sortField];
      let bVal: any = b.data[sortField];

      // Handle string comparisons
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';

      // Handle undefined values
      if (aVal === undefined || aVal === '') return 1;
      if (bVal === undefined || bVal === '') return -1;

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data.nodes, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getConnectionCount = (nodeId: string): number => {
    return data.edges.filter(
      edge => edge.data.source === nodeId || edge.data.target === nodeId
    ).length;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
        sortField === field ? 'bg-linkedin-100 text-linkedin-700' : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      <span className="text-xs font-medium">{label}</span>
      {sortField === field && (
        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search connections by name, company, position, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-linkedin-500 focus:border-transparent outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span className="font-medium">
            {filteredAndSortedConnections.length} of {data.nodes.length} connections
          </span>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600 font-medium">Sort by:</span>
        <SortButton field="name" label="Name" />
        <SortButton field="company" label="Company" />
        <SortButton field="position" label="Position" />
        <SortButton field="location" label="Location" />
        <SortButton field="degree" label="Connections" />
        <SortButton field="connected_on" label="Date" />
      </div>

      {/* Connections List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedConnections.map((node, index) => {
            const isExpanded = expandedId === node.data.id;
            const isSelected = selectedNode?.id === node.data.id;
            const connectionCount = getConnectionCount(node.data.id);

            return (
              <motion.div
                key={node.data.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={`bg-white rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-linkedin-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => {
                    onNodeSelect(node.data);
                    toggleExpand(node.data.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {node.data.label}
                      </h3>
                      
                      <div className="mt-2 space-y-1">
                        {node.data.position && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Briefcase className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{node.data.position}</span>
                          </div>
                        )}
                        
                        {node.data.company && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building2 className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{node.data.company}</span>
                          </div>
                        )}
                        
                        {node.data.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{node.data.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-1 px-3 py-1 bg-linkedin-50 text-linkedin-700 rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs font-medium">{connectionCount} connections</span>
                      </div>
                      
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                        {node.data.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                            <a
                              href={`mailto:${node.data.email}`}
                              className="text-linkedin-600 hover:text-linkedin-700 truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {node.data.email}
                            </a>
                          </div>
                        )}
                        
                        {node.data.connected_on && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                            <span>Connected on {new Date(node.data.connected_on).toLocaleDateString()}</span>
                          </div>
                        )}

                        {node.data.degree !== undefined && (
                          <div className="grid grid-cols-2 gap-3 pt-2 mt-2 border-t border-gray-100">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-xs text-gray-500">Network Degree</div>
                              <div className="text-lg font-semibold text-gray-900">{node.data.degree}</div>
                            </div>
                            {node.data.betweenness !== undefined && (
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="text-xs text-gray-500">Betweenness</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {node.data.betweenness.toFixed(3)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAndSortedConnections.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No connections found matching your search.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-linkedin-600 hover:text-linkedin-700"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsList;
