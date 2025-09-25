import React, { useState } from 'react';
import { Brain, Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { queryGraph } from '../services/api';
import { QueryResult } from '../types';

interface QueryBarProps {
  onQueryResult: (result: QueryResult) => void;
}

const QueryBar: React.FC<QueryBarProps> = ({ onQueryResult }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string>('');

  const exampleQueries = [
    "Show me Google engineers in San Francisco with many connections",
    "Who are the top connectors between fintech and product management?",
    "Find people from Stanford working at tech companies",
    "Show connections between consultants and data scientists",
    "Who are the most influential people in my network?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await queryGraph(query);
      onQueryResult(result);
      setLastExplanation(result.explain);
      toast.success('Query executed successfully!');
    } catch (error) {
      console.error('Query error:', error);
      toast.error('Failed to execute query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI-Powered Network Query</h3>
          <p className="text-sm text-gray-600">Ask natural language questions about your network</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Show me Google engineers in Bangalore with many connections"
            className="input-field pr-12"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-linkedin-600 hover:text-linkedin-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-linkedin-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {lastExplanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Query Result:</p>
              <p className="text-sm text-blue-700">{lastExplanation}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Example Queries:</h4>
        <div className="flex flex-wrap gap-2">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryBar;