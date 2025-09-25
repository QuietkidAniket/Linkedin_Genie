import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Upload, Brain, Settings, BarChart3 } from 'lucide-react';
import UploadForm from './components/UploadForm';
import GraphView from './components/GraphView';
import FilterPanel from './components/FilterPanel';
import QueryBar from './components/QueryBar';
import NodeDetail from './components/NodeDetail';
import MetricsPanel from './components/MetricsPanel';
import SettingsPanel from './components/SettingsPanel';
import { GraphData, FilterOptions, NodeData, GraphMetrics } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'upload' | 'graph'>('upload');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [filteredData, setFilteredData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [metrics, setMetrics] = useState<GraphMetrics | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pathHighlight, setPathHighlight] = useState<any>(null);
  const [subgraphMode, setSubgraphMode] = useState(false);

  const handleGraphBuilt = useCallback((data: GraphData, metricsData: GraphMetrics) => {
    setGraphData(data);
    setFilteredData(data);
    setMetrics(metricsData);
    setCurrentView('graph');
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Apply filters to graph data
    if (graphData) {
      const filtered = applyFilters(graphData, newFilters);
      setFilteredData(filtered);
    }
  }, [graphData]);

  const applyFilters = (data: GraphData, filterOptions: FilterOptions): GraphData => {
    let filteredNodes = data.nodes;
    let filteredEdges = data.edges;

    // Apply company filter
    if (filterOptions.companies && filterOptions.companies.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filterOptions.companies!.some(company => 
          node.data.company?.toLowerCase().includes(company.toLowerCase())
        )
      );
    }

    // Apply position filter
    if (filterOptions.positions && filterOptions.positions.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        filterOptions.positions!.some(position =>
          node.data.position?.toLowerCase().includes(position.toLowerCase())
        )
      );
    }

    // Apply location filter
    if (filterOptions.location) {
      filteredNodes = filteredNodes.filter(node =>
        node.data.location?.toLowerCase().includes(filterOptions.location!.toLowerCase())
      );
    }

    // Apply minimum degree filter
    if (filterOptions.min_degree) {
      filteredNodes = filteredNodes.filter(node =>
        (node.data.degree || 0) >= filterOptions.min_degree!
      );
    }

    // Filter edges to only include those between remaining nodes
    const nodeIds = new Set(filteredNodes.map(node => node.data.id));
    filteredEdges = filteredEdges.filter(edge =>
      nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  };

  const handleQueryResult = useCallback((result: any) => {
    if (result.graph) {
      setFilteredData(result.graph);
      setFilters(result.filter || {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-linkedin-500 rounded-lg">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LinkedIn Genie</h1>
                <p className="text-sm text-gray-500">Connection Graph Viewer</p>
              </div>
            </div>
            
            {currentView === 'graph' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMetrics(!showMetrics)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="View Metrics"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="btn-secondary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  New Upload
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentView === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <UploadForm onGraphBuilt={handleGraphBuilt} />
            </motion.div>
          ) : (
            <motion.div
              key="graph"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Query Bar */}
              <QueryBar onQueryResult={handleQueryResult} />

              <div className="grid grid-cols-12 gap-6">
                {/* Filter Panel */}
                <div className="col-span-12 lg:col-span-3">
                  <FilterPanel
                    graphData={graphData}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>

                {/* Graph View */}
                <div className="col-span-12 lg:col-span-6">
                  <div className="card h-[600px]">
                    {filteredData && (
                      <GraphView
                        data={filteredData}
                        onNodeSelect={setSelectedNode}
                        selectedNode={selectedNode}
                      />
                    )}
                  </div>
                </div>

                {/* Node Detail */}
                <div className="col-span-12 lg:col-span-3">
                  <NodeDetail
                    node={selectedNode}
                    graphData={filteredData}
                    onShowPath={setPathHighlight}
                    onShowSubgraph={(subgraph) => {
                      setFilteredData(subgraph);
                      setSubgraphMode(true);
                    }}
                  />
                </div>
              </div>

              {/* Action Bar */}
              {(pathHighlight || subgraphMode) && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    {pathHighlight && (
                      <span className="text-blue-800 font-medium">
                        Path highlighted: {pathHighlight.length} steps
                      </span>
                    )}
                    {subgraphMode && (
                      <span className="text-blue-800 font-medium">
                        Showing subgraph view
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {subgraphMode && (
                      <button
                        onClick={() => {
                          setFilteredData(graphData);
                          setSubgraphMode(false);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Show Full Graph
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setPathHighlight(null);
                        setSubgraphMode(false);
                        setFilteredData(graphData);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onSettingsChange={(settings) => {
              // Handle settings change
              console.log('Settings changed:', settings);
            }}
          />
        )}
      </AnimatePresence>

      {/* Metrics Panel */}
      <AnimatePresence>
        {showMetrics && metrics && (
          <MetricsPanel
            metrics={metrics}
            onClose={() => setShowMetrics(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;