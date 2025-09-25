import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Settings, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GraphData, ColumnMapping, InferenceSettings, GraphMetrics } from '../types';
import { uploadCSV, buildGraph } from '../services/api';

interface UploadFormProps {
  onGraphBuilt: (data: GraphData, metrics: GraphMetrics) => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onGraphBuilt }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [inferenceSettings, setInferenceSettings] = useState<InferenceSettings>({
    company_weight: 3,
    school_weight: 2,
    location_weight: 1,
    position_weight: 1,
    threshold: 2,
    fuzzy_matching: true,
    similarity_threshold: 85
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'settings'>('upload');

  const canonicalFields = [
    'first_name',
    'last_name', 
    'email',
    'company',
    'position',
    'location',
    'school',
    'connected_on'
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (csvFile) {
      setFile(csvFile);
      parseCSVPreview(csvFile);
    }
  }, []);

  const parseCSVPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6); // First 5 rows + header
      const rows = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
      setCsvPreview(rows);
      
      // Auto-suggest column mappings
      const headers = rows[0];
      const suggestions: ColumnMapping = {};
      
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
          suggestions[index] = 'first_name';
        } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
          suggestions[index] = 'last_name';
        } else if (lowerHeader.includes('email')) {
          suggestions[index] = 'email';
        } else if (lowerHeader.includes('company')) {
          suggestions[index] = 'company';
        } else if (lowerHeader.includes('position') || lowerHeader.includes('title')) {
          suggestions[index] = 'position';
        } else if (lowerHeader.includes('location') || lowerHeader.includes('city')) {
          suggestions[index] = 'location';
        } else if (lowerHeader.includes('school') || lowerHeader.includes('university')) {
          suggestions[index] = 'school';
        } else if (lowerHeader.includes('connected')) {
          suggestions[index] = 'connected_on';
        }
      });
      
      setColumnMapping(suggestions);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const handleBuildGraph = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(columnMapping));
      formData.append('settings', JSON.stringify(inferenceSettings));

      const uploadResult = await uploadCSV(formData);
      
      if (uploadResult.status === 'ok') {
        const graphResult = await buildGraph();
        onGraphBuilt(graphResult.graph, graphResult.metrics);
        toast.success(`Graph built successfully! ${uploadResult.nodes} nodes, ${uploadResult.edges} edges`);
      }
    } catch (error) {
      console.error('Error building graph:', error);
      toast.error('Failed to build graph. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-16 h-16 bg-linkedin-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Upload className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Your LinkedIn Connections</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Export your LinkedIn connections as CSV and upload here to visualize your professional network with AI-powered insights.
        </p>
      </div>

      {/* Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[
            { key: 'upload', label: 'Upload CSV', icon: Upload },
            { key: 'mapping', label: 'Map Columns', icon: FileText },
            { key: 'settings', label: 'Configure', icon: Settings }
          ].map(({ key, label, icon: Icon }, index) => (
            <div key={key} className="flex items-center">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                step === key ? 'bg-linkedin-500 text-white' : 
                ['upload', 'mapping', 'settings'].indexOf(step) > index ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              {index < 2 && (
                <div className="w-8 h-0.5 bg-gray-300 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-linkedin-500 bg-linkedin-50' : 'border-gray-300 hover:border-linkedin-400'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-linkedin-600 font-medium">Drop your CSV file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop your LinkedIn connections CSV file here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports CSV files exported from LinkedIn
                </p>
              </div>
            )}
          </div>
          
          {file && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{file.name}</p>
                  <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {step === 'mapping' && csvPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">Map CSV Columns</h3>
          <p className="text-gray-600 mb-6">
            Map your CSV columns to the standard fields. We've made some suggestions based on your headers.
          </p>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {csvPreview[0].map((header, index) => (
                    <th key={index} className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.slice(1, 4).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-100">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2 text-sm text-gray-600">
                        {cell.length > 30 ? `${cell.substring(0, 30)}...` : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {csvPreview[0].map((header, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {header}
                  </label>
                  <select
                    value={columnMapping[index] || ''}
                    onChange={(e) => setColumnMapping(prev => ({
                      ...prev,
                      [index]: e.target.value
                    }))}
                    className="input-field"
                  >
                    <option value="">-- Skip this column --</option>
                    {canonicalFields.map(field => (
                      <option key={field} value={field}>
                        {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep('upload')}
              className="btn-secondary"
            >
              Back
            </button>
            <button
              onClick={() => setStep('settings')}
              className="btn-primary"
              disabled={Object.keys(columnMapping).length === 0}
            >
              Next: Configure Settings
            </button>
          </div>
        </motion.div>
      )}

      {step === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">Inference Settings</h3>
          <p className="text-gray-600 mb-6">
            Configure how connections are inferred between your contacts based on shared attributes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Attribute Weights</h4>
              <div className="space-y-4">
                {[
                  { key: 'company_weight', label: 'Same Company', description: 'People from the same company' },
                  { key: 'school_weight', label: 'Same School', description: 'Alumni from the same institution' },
                  { key: 'location_weight', label: 'Same Location', description: 'People in the same city/region' },
                  { key: 'position_weight', label: 'Similar Position', description: 'Similar job titles or roles' }
                ].map(({ key, label, description }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {inferenceSettings[key as keyof InferenceSettings]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={inferenceSettings[key as keyof InferenceSettings] as number}
                      onChange={(e) => setInferenceSettings(prev => ({
                        ...prev,
                        [key]: parseFloat(e.target.value)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Connection Threshold</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Minimum Score</label>
                    <span className="text-sm font-medium text-gray-900">{inferenceSettings.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={inferenceSettings.threshold}
                    onChange={(e) => setInferenceSettings(prev => ({
                      ...prev,
                      threshold: parseFloat(e.target.value)
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values create fewer, stronger connections
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">Fuzzy Matching</h4>
                  <div className="flex items-center space-x-3 mb-4">
                    <input
                      type="checkbox"
                      id="fuzzy_matching"
                      checked={inferenceSettings.fuzzy_matching}
                      onChange={(e) => setInferenceSettings(prev => ({
                        ...prev,
                        fuzzy_matching: e.target.checked
                      }))}
                      className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                    />
                    <label htmlFor="fuzzy_matching" className="text-sm font-medium text-gray-700">
                      Enable fuzzy matching for company names
                    </label>
                  </div>
                  
                  {inferenceSettings.fuzzy_matching && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Similarity Threshold</label>
                        <span className="text-sm font-medium text-gray-900">{inferenceSettings.similarity_threshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="100"
                        step="5"
                        value={inferenceSettings.similarity_threshold}
                        onChange={(e) => setInferenceSettings(prev => ({
                          ...prev,
                          similarity_threshold: parseInt(e.target.value)
                        }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep('mapping')}
              className="btn-secondary"
            >
              Back
            </button>
            <button
              onClick={handleBuildGraph}
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Building Graph<span className="loading-dots"></span></span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Build Graph</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UploadForm;