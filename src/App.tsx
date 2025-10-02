import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Upload, Settings, BarChart3 } from 'lucide-react';
import UploadForm from './components/UploadForm';
import ConnectionsList from './components/ConnectionsList';
import FilterPanel from './components/FilterPanel';
import QueryBar from './components/QueryBar';
import NodeDetail from './components/NodeDetail';
import MetricsPanel from './components/MetricsPanel';
import SettingsPanel from './components/SettingsPanel';
import { GraphData, FilterOptions, NodeData, GraphMetrics, QueryResult } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'upload' | 'dashboard'>('upload');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [queryResult, setQueryResult] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [metrics, setMetrics] = useState<GraphMetrics | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  const handleGraphBuilt = useCallback((data: GraphData, metricsData: GraphMetrics) => {
    setGraphData(data);
    setMetrics(metricsData);
    setFilters({});
    setQueryResult(null);
    setCurrentView('dashboard');
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setQueryResult(null); // Clear query results when manual filters change
  }, []);

  const handleQueryResult = useCallback((result: QueryResult) => {
    setQueryResult(result.graph);
    setFilters(result.filter || {});
  }, []);
  
  const filteredData = useMemo(() => {
    if (queryResult) {
      return queryResult;
    }
    if (!graphData) {
      return null;
    }

    let filteredNodes = graphData.nodes;

    if (filters.companies && filters.companies.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        filters.companies!.some(company =>
          node.data.company?.toLowerCase().includes(company.toLowerCase())
        )
      );
    }

    if (filters.positions && filters.positions.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        filters.positions!.some(position =>
          node.data.position?.toLowerCase().includes(position.toLowerCase())
        )
      );
    }

    if (filters.location) {
      filteredNodes = filteredNodes.filter(node =>
        node.data.location?.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }
    
    if (filters.min_degree) {
      filteredNodes = filteredNodes.filter(node =>
        (node.data.degree || 0) >= filters.min_degree!
      );
    }
    
    if (filters.date_from || filters.date_to) {
        filteredNodes = filteredNodes.filter(node => {
            if (!node.data.connected_on) return false;
            const connectionDate = new Date(node.data.connected_on);
            if (filters.date_from && connectionDate < new Date(filters.date_from)) return false;
            if (filters.date_to && connectionDate > new Date(filters.date_to)) return false;
            return true;
        });
    }

    const nodeIds = new Set(filteredNodes.map(node => node.data.id));
    const filteredEdges = graphData.edges.filter(edge =>
      nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, filters, queryResult]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-linkedin-500 rounded-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LinkedIn Genie</h1>
                <p className="text-sm text-gray-500">Your Personal Connections Analyst</p>
              </div>
            </div>
            {currentView === 'dashboard' && (
              <div className="flex items-center space-x-2">
                <button onClick={() => setShowMetrics(true)} className="btn-secondary p-2" title="View Metrics"><BarChart3 className="w-5 h-5" /></button>
                <button onClick={() => setShowSettings(true)} className="btn-secondary p-2" title="Settings"><Settings className="w-5 h-5" /></button>
                <button onClick={() => setCurrentView('upload')} className="btn-primary flex items-center"><Upload className="w-4 h-4 mr-2" />New Upload</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AnimatePresence mode="wait">
          {currentView === 'upload' ? (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <UploadForm onGraphBuilt={handleGraphBuilt} />
            </motion.div>
          ) : (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <QueryBar onQueryResult={handleQueryResult} />
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-3">
                  <div className="sticky top-24">
                    <FilterPanel graphData={graphData} filters={filters} onFilterChange={handleFilterChange} />
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-6">
                  {filteredData && <ConnectionsList data={filteredData} onNodeSelect={setSelectedNode} selectedNode={selectedNode} />}
                </div>
                <div className="col-span-12 lg:col-span-3">
                  <div className="sticky top-24">
                    <NodeDetail node={selectedNode} graphData={filteredData} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer className="py-4 mt-auto">
        <div className="text-center text-sm text-gray-500">
          Created by <a href="https://github.com/QuietkidAniket" target="_blank" rel="noopener noreferrer" className="font-medium text-linkedin-600 hover:underline">Aniket Kundu</a>
        </div>
      </footer>

      <AnimatePresence>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onSettingsChange={console.log} />}
        {showMetrics && metrics && <MetricsPanel metrics={metrics} onClose={() => setShowMetrics(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;