import React, { useState, useMemo } from 'react';
import { Search, Users, ChevronDown, ChevronUp, X, Building2, Briefcase, MapPin, TrendingUp, Mail, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphData, NodeData } from '../types';

interface ConnectionsListProps {
  data: GraphData;
  onNodeSelect: (node: NodeData | null) => void;
  selectedNode: NodeData | null;
}

type SortField = 'label' | 'company' | 'position' | 'degree';
type SortOrder = 'asc' | 'desc';

const ConnectionsList: React.FC<ConnectionsListProps> = ({ data, onNodeSelect, selectedNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('degree');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSortedConnections = useMemo(() => {
    const filtered = data.nodes.filter(node => {
      const searchLower = searchTerm.toLowerCase();
      const nodeText = [node.data.label, node.data.company, node.data.position, node.data.location, node.data.email].join(' ').toLowerCase();
      return nodeText.includes(searchLower);
    });

    return filtered.sort((a, b) => {
      const aVal = a.data[sortField] || (sortField === 'degree' ? 0 : '');
      const bVal = b.data[sortField] || (sortField === 'degree' ? 0 : '');

      if (sortField === 'degree') {
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
      return sortOrder === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [data.nodes, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
        sortField === field ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      <span className="text-xs font-medium">{label}</span>
      {sortField === field && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </button>
  );

  return (
    <div className="card h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">Sort by:</span>
            <SortButton field="label" label="Name" />
            <SortButton field="degree" label="Connections" />
            <SortButton field="company" label="Company" />
          </div>
          <div className="text-gray-500 font-medium">{filteredAndSortedConnections.length} results</div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        <AnimatePresence>
          {filteredAndSortedConnections.map((node) => (
            <motion.div
              layout
              key={node.data.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onNodeSelect(node.data)}
              className={`p-4 cursor-pointer border-b border-gray-100 transition-colors ${selectedNode?.id === node.data.id ? 'bg-linkedin-500/10' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{node.data.label}</p>
                  <p className="text-sm text-gray-600 flex items-center mt-1"><Briefcase className="w-4 h-4 mr-2 text-gray-400" /> {node.data.position || 'N/A'}</p>
                  <p className="text-sm text-gray-500 flex items-center mt-1"><Building2 className="w-4 h-4 mr-2 text-gray-400" /> {node.data.company || 'N/A'}</p>
                  <p className="text-sm text-gray-500 flex items-center mt-1"><MapPin className="w-4 h-4 mr-2 text-gray-400" /> {node.data.location || 'N/A'}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="flex items-center text-sm font-semibold text-blue-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {node.data.degree || 0}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredAndSortedConnections.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No connections found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsList;