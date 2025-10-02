import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { GraphData, FilterOptions } from '../types';

// (The rest of the component code is the same as the last version you received, as the logic was mostly correct. The main bug was in how App.tsx handled the state updates from this component.)
// ... I will include the full code for completeness.

interface FilterPanelProps {
  graphData: GraphData | null;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ graphData, filters, onFilterChange }) => {
  const [expandedSections, setExpandedSections] = useState({
    companies: true,
    positions: true,
    metrics: true,
    dates: false
  });

  const [availableCompanies, setAvailableCompanies] = useState<Array<{ name: string; count: number }>>([]);
  const [availablePositions, setAvailablePositions] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    if (!graphData) return;

    const companyMap = new Map<string, number>();
    graphData.nodes.forEach(node => {
      if (node.data.company) {
        companyMap.set(node.data.company, (companyMap.get(node.data.company) || 0) + 1);
      }
    });
    setAvailableCompanies(
      Array.from(companyMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    );

    const positionMap = new Map<string, number>();
     graphData.nodes.forEach(node => {
        const keywords = (node.data.position || '').toLowerCase().split(/[\s,/-]+/);
        keywords.forEach(kw => {
            if (kw.length > 2) {
                 positionMap.set(kw, (positionMap.get(kw) || 0) + 1);
            }
        });
    });
    setAvailablePositions(
        Array.from(positionMap.entries())
            .map(([name, count]) => ({name, count}))
            .sort((a,b) => b.count - a.count)
            .slice(0, 15)
    );

  }, [graphData]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCompanyToggle = (company: string) => {
    const currentCompanies = filters.companies || [];
    const newCompanies = currentCompanies.includes(company)
      ? currentCompanies.filter(c => c !== company)
      : [...currentCompanies, company];
    onFilterChange({ ...filters, companies: newCompanies });
  };
  
  const handlePositionToggle = (position: string) => {
    const currentPositions = filters.positions || [];
    const newPositions = currentPositions.includes(position)
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position];
    onFilterChange({ ...filters, positions: newPositions });
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value
  );

  return (
    <div className="card">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center"><Filter className="w-5 h-5 mr-2" /> Filters</h3>
            {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-sm text-red-600 hover:underline flex items-center"><X className="w-3 h-3 mr-1" /> Clear All</button>
            )}
        </div>
        
        {/* Sections for filters */}
        <div className="space-y-4">
            {/* Companies */}
            <div>
              <button onClick={() => toggleSection('companies')} className="w-full flex justify-between items-center">
                  <span className="font-medium">Companies</span>
                  {expandedSections.companies ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.companies && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {availableCompanies.map(({ name, count }) => (
                          <label key={name} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-100">
                              <input type="checkbox" checked={filters.companies?.includes(name) || false} onChange={() => handleCompanyToggle(name)} />
                              <span className="flex-1 truncate">{name}</span>
                              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{count}</span>
                          </label>
                      ))}
                  </div>
              )}
            </div>

            {/* Positions */}
            <div>
                 <button onClick={() => toggleSection('positions')} className="w-full flex justify-between items-center">
                  <span className="font-medium">Position Keywords</span>
                  {expandedSections.positions ? <ChevronUp /> : <ChevronDown />}
              </button>
               {expandedSections.positions && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {availablePositions.map(({ name, count }) => (
                          <label key={name} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-100">
                              <input type="checkbox" checked={filters.positions?.includes(name) || false} onChange={() => handlePositionToggle(name)} />
                              <span className="flex-1 truncate capitalize">{name}</span>
                              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{count}</span>
                          </label>
                      ))}
                  </div>
              )}
            </div>

            {/* Metrics */}
            <div>
                <button onClick={() => toggleSection('metrics')} className="w-full flex justify-between items-center">
                    <span className="font-medium">Network Metrics</span>
                    {expandedSections.metrics ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.metrics && (
                    <div className="mt-2 space-y-3">
                        <div>
                            <label className="block text-sm mb-1">Min Connections: {filters.min_degree || 0}</label>
                            <input type="range" min="0" max="50" value={filters.min_degree || 0} onChange={e => onFilterChange({...filters, min_degree: parseInt(e.target.value)})} className="w-full"/>
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Location</label>
                            <input type="text" placeholder="e.g., San Francisco" value={filters.location || ''} onChange={e => onFilterChange({...filters, location: e.target.value})} className="input-field"/>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Dates */}
            <div>
                <button onClick={() => toggleSection('dates')} className="w-full flex justify-between items-center">
                    <span className="font-medium">Connection Date</span>
                    {expandedSections.dates ? <ChevronUp /> : <ChevronDown />}
                </button>
                 {expandedSections.dates && (
                    <div className="mt-2 space-y-3">
                        <div>
                            <label className="block text-sm mb-1">From</label>
                            <input type="date" value={filters.date_from || ''} onChange={e => onFilterChange({...filters, date_from: e.target.value})} className="input-field"/>
                        </div>
                        <div>
                            <label className="block text-sm mb-1">To</label>
                            <input type="date" value={filters.date_to || ''} onChange={e => onFilterChange({...filters, date_to: e.target.value})} className="input-field"/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default FilterPanel;