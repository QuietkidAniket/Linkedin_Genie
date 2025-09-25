import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { GraphData, FilterOptions } from '../types';

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

    // Extract unique companies with counts
    const companyMap = new Map<string, number>();
    const positionMap = new Map<string, number>();

    graphData.nodes.forEach(node => {
      const company = node.data.company;
      const position = node.data.position;

      if (company) {
        companyMap.set(company, (companyMap.get(company) || 0) + 1);
      }

      if (position) {
        // Extract keywords from position
        const keywords = position.toLowerCase()
          .split(/[\s,\-\(\)]+/)
          .filter(word => word.length > 2 && !['and', 'the', 'for', 'with', 'at'].includes(word));
        
        keywords.forEach(keyword => {
          positionMap.set(keyword, (positionMap.get(keyword) || 0) + 1);
        });
      }
    });

    setAvailableCompanies(
      Array.from(companyMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    );

    setAvailablePositions(
      Array.from(positionMap.entries())
        .map(([name, count]) => ({ name, count }))
        .filter(({ count }) => count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    );
  }, [graphData]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof FilterOptions];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  return (
    <div className="card h-fit">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Companies */}
        <div>
          <button
            onClick={() => toggleSection('companies')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-700">Companies</span>
            {expandedSections.companies ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.companies && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {availableCompanies.map(({ name, count }) => (
                <label key={name} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.companies?.includes(name) || false}
                    onChange={() => handleCompanyToggle(name)}
                    className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Positions */}
        <div>
          <button
            onClick={() => toggleSection('positions')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-700">Position Keywords</span>
            {expandedSections.positions ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.positions && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {availablePositions.map(({ name, count }) => (
                <label key={name} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.positions?.includes(name) || false}
                    onChange={() => handlePositionToggle(name)}
                    className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                  />
                  <span className="text-sm text-gray-700 flex-1 capitalize">{name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div>
          <button
            onClick={() => toggleSection('metrics')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-700">Network Metrics</span>
            {expandedSections.metrics ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.metrics && (
            <div className="mt-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Connections: {filters.min_degree || 0}
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={filters.min_degree || 0}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    min_degree: parseInt(e.target.value) || undefined 
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., San Francisco, London"
                  value={filters.location || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    location: e.target.value || undefined 
                  })}
                  className="input-field text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div>
          <button
            onClick={() => toggleSection('dates')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-700">Connection Date</span>
            {expandedSections.dates ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.dates && (
            <div className="mt-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    date_from: e.target.value || undefined 
                  })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    date_to: e.target.value || undefined 
                  })}
                  className="input-field text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
          <div className="space-y-1 text-xs text-gray-600">
            {filters.companies && filters.companies.length > 0 && (
              <div>Companies: {filters.companies.length} selected</div>
            )}
            {filters.positions && filters.positions.length > 0 && (
              <div>Positions: {filters.positions.length} selected</div>
            )}
            {filters.location && (
              <div>Location: {filters.location}</div>
            )}
            {filters.min_degree && (
              <div>Min Connections: {filters.min_degree}</div>
            )}
            {(filters.date_from || filters.date_to) && (
              <div>Date Range: {filters.date_from || 'Any'} to {filters.date_to || 'Any'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;