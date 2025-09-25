import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';
import { GraphData, NodeData } from '../types';
import { ZoomIn, ZoomOut, Maximize, Download, RefreshCw } from 'lucide-react';

// Register layouts
cytoscape.use(coseBilkent);
cytoscape.use(fcose);
cytoscape.use(dagre);

interface GraphViewProps {
  data: GraphData;
  onNodeSelect: (node: NodeData | null) => void;
  selectedNode: NodeData | null;
}

const GraphView: React.FC<GraphViewProps> = ({ data, onNodeSelect, selectedNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [layout, setLayout] = useState<string>('fcose');
  const [colorBy, setColorBy] = useState<'company' | 'community' | 'degree'>('company');
  const [isLoading, setIsLoading] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [nodeSize, setNodeSize] = useState<'degree' | 'betweenness' | 'uniform'>('degree');

  // Color palettes
  const companyColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
  ];

  const communityColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9'
  ];

  useEffect(() => {
    if (!containerRef.current || !data.nodes.length) return;

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...data.nodes.map(node => ({
          data: {
            ...node.data,
            label: node.data.label || `${node.data.company || 'Unknown'}`
          }
        })),
        ...data.edges.map(edge => ({
          data: edge.data
        }))
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => getNodeColor(ele.data(), colorBy),
            'width': (ele: any) => getNodeSize(ele.data(), nodeSize),
            'height': (ele: any) => getNodeSize(ele.data(), nodeSize),
            'label': 'data(label)',
            'font-size': '10px',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'text-outline-width': 2,
            'text-outline-color': '#000000',
            'border-width': 2,
            'border-color': '#ffffff',
            'cursor': 'pointer'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#0077b5',
            'box-shadow': '0 0 20px #0077b5'
          }
        },
        {
          selector: 'node:hover',
          style: {
            'border-width': 3,
            'border-color': '#0077b5'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => Math.max(1, (ele.data('weight') || 1) * 0.5),
            'line-color': '#cbd5e1',
            'target-arrow-color': '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6,
            'label': showEdgeLabels ? (ele: any) => `${ele.data('weight')}` : '',
            'font-size': '8px',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': '#0077b5',
            'target-arrow-color': '#0077b5',
            'opacity': 1
          }
        },
        {
          selector: '.highlighted',
          style: {
            'line-color': '#0077b5',
            'target-arrow-color': '#0077b5',
            'opacity': 1,
            'width': 3
          }
        }
      ],
      layout: {
        name: layout,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50,
        ...(layout === 'fcose' && {
          quality: 'default',
          randomize: false,
          animate: 'end',
          animationDuration: 1000,
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          packComponents: true,
          nodeRepulsion: 4500,
          idealEdgeLength: 50,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500,
          tile: true,
          tilingPaddingVertical: 10,
          tilingPaddingHorizontal: 10
        }),
        ...(layout === 'cose-bilkent' && {
          quality: 'default',
          nodeDimensionsIncludeLabels: true,
          refresh: 30,
          fit: true,
          padding: 50,
          randomize: true,
          nodeRepulsion: 4500,
          idealEdgeLength: 50,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500,
          tile: true,
          animate: 'end',
          animationDuration: 1000,
          tilingPaddingVertical: 10,
          tilingPaddingHorizontal: 10
        })
      }
    });

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      onNodeSelect(nodeData);
      
      // Highlight connected edges
      cy.elements().removeClass('highlighted');
      node.connectedEdges().addClass('highlighted');
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onNodeSelect(null);
        cy.elements().removeClass('highlighted');
      }
    });

    // Tooltip on hover
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      
      // Create tooltip (you can enhance this with a proper tooltip library)
      const tooltip = document.createElement('div');
      tooltip.className = 'absolute bg-gray-900 text-white p-2 rounded shadow-lg text-sm z-50 pointer-events-none';
      tooltip.innerHTML = `
        <div class="font-semibold">${nodeData.label}</div>
        <div class="text-gray-300">${nodeData.company || 'Unknown Company'}</div>
        <div class="text-gray-300">${nodeData.position || 'Unknown Position'}</div>
        <div class="text-gray-300">Connections: ${nodeData.degree || 0}</div>
      `;
      
      document.body.appendChild(tooltip);
      
      const updateTooltipPosition = (e: MouseEvent) => {
        tooltip.style.left = `${e.clientX + 10}px`;
        tooltip.style.top = `${e.clientY - 10}px`;
      };
      
      document.addEventListener('mousemove', updateTooltipPosition);
      
      node.on('mouseout', () => {
        document.removeEventListener('mousemove', updateTooltipPosition);
        tooltip.remove();
      });
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [data, layout, colorBy, onNodeSelect]);

  // Update selected node
  useEffect(() => {
    if (!cyRef.current) return;
    
    cyRef.current.nodes().removeClass('selected');
    if (selectedNode) {
      const node = cyRef.current.getElementById(selectedNode.id);
      if (node.length) {
        node.addClass('selected');
        cyRef.current.center(node);
      }
    }
  }, [selectedNode]);

  const getNodeSize = (nodeData: any, sizeBy: string): number => {
    const baseSize = 20;
    const maxSize = 60;
    
    switch (sizeBy) {
      case 'degree':
        const degree = nodeData.degree || 1;
        const maxDegree = Math.max(...data.nodes.map(n => n.data.degree || 1));
        return Math.max(baseSize, Math.min(maxSize, baseSize + (degree / maxDegree) * (maxSize - baseSize)));
      
      case 'betweenness':
        const betweenness = nodeData.betweenness || 0;
        const maxBetweenness = Math.max(...data.nodes.map(n => n.data.betweenness || 0));
        return Math.max(baseSize, Math.min(maxSize, baseSize + (betweenness / maxBetweenness) * (maxSize - baseSize)));
      
      case 'uniform':
      default:
        return baseSize;
    }
  };

  const getNodeColor = (nodeData: any, colorBy: string): string => {
    switch (colorBy) {
      case 'company':
        if (!nodeData.company) return '#94a3b8';
        const companyHash = nodeData.company.split('').reduce((a: number, b: string) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        return companyColors[Math.abs(companyHash) % companyColors.length];
      
      case 'community':
        const community = nodeData.community || 0;
        return communityColors[community % communityColors.length];
      
      case 'degree':
        const degree = nodeData.degree || 0;
        const maxDegree = Math.max(...data.nodes.map(n => n.data.degree || 0));
        const intensity = degree / maxDegree;
        return `hsl(${220 - intensity * 60}, 70%, ${30 + intensity * 40}%)`;
      
      default:
        return '#3b82f6';
    }
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  const handleResetLayout = () => {
    if (cyRef.current) {
      setIsLoading(true);
      const layoutOptions = {
        name: layout,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50,
        stop: () => setIsLoading(false)
      };
      cyRef.current.layout(layoutOptions).run();
    }
  };

  const handleExportPNG = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ scale: 2, full: true });
      const link = document.createElement('a');
      link.download = 'linkedin-network.png';
      link.href = png;
      link.click();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-xs font-medium text-gray-700">Layout:</label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="fcose">Force-Directed</option>
              <option value="cose-bilkent">Cose-Bilkent</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
              <option value="dagre">Hierarchical</option>
              <option value="concentric">Concentric</option>
              <option value="breadthfirst">Breadth First</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">Color by:</label>
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as any)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="company">Company</option>
              <option value="community">Community</option>
              <option value="degree">Connections</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">Size by:</label>
            <select
              value={nodeSize}
              onChange={(e) => setNodeSize(e.target.value as any)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="degree">Degree</option>
              <option value="betweenness">Centrality</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={showEdgeLabels}
                onChange={(e) => setShowEdgeLabels(e.target.checked)}
                className="mr-1"
              />
              Edge Labels
            </label>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleFit}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Fit to Screen"
        >
          <Maximize className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleResetLayout}
          disabled={isLoading}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Reset Layout"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={handleExportPNG}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Export as PNG"
        >
          <Download className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full cy-container"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-linkedin-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Updating layout...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;