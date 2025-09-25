import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Sliders, Eye, EyeOff, Save } from 'lucide-react';
import { InferenceSettings } from '../types';

interface SettingsPanelProps {
  onClose: () => void;
  onSettingsChange: (settings: InferenceSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<InferenceSettings>({
    company_weight: 3,
    school_weight: 2,
    location_weight: 1,
    position_weight: 1,
    threshold: 2,
    fuzzy_matching: true,
    similarity_threshold: 85
  });

  const [privacySettings, setPrivacySettings] = useState({
    mask_emails: true,
    show_raw_data: false,
    local_processing: true
  });

  const handleSave = () => {
    onSettingsChange(settings);
    onClose();
  };

  const resetToDefaults = () => {
    setSettings({
      company_weight: 3,
      school_weight: 2,
      location_weight: 1,
      position_weight: 1,
      threshold: 2,
      fuzzy_matching: true,
      similarity_threshold: 85
    });
  };

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
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-500 rounded-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Settings</h2>
              <p className="text-gray-600">Configure graph inference and privacy settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Inference Settings */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Sliders className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Graph Inference Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Attribute Weights</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Adjust how much each shared attribute contributes to connection inference.
                </p>
                
                {[
                  { key: 'company_weight', label: 'Same Company', description: 'People from the same organization' },
                  { key: 'school_weight', label: 'Same School', description: 'Alumni from the same institution' },
                  { key: 'location_weight', label: 'Same Location', description: 'People in the same city/region' },
                  { key: 'position_weight', label: 'Similar Position', description: 'Similar job titles or roles' }
                ].map(({ key, label, description }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="text-sm font-medium text-gray-700">{label}</label>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {settings[key as keyof InferenceSettings]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={settings[key as keyof InferenceSettings] as number}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        [key]: parseFloat(e.target.value)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>No Weight</span>
                      <span>Max Weight</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Connection Threshold</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Minimum combined weight required to create a connection between two people.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Minimum Score</label>
                    <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {settings.threshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={settings.threshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      threshold: parseFloat(e.target.value)
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>More Connections</span>
                    <span>Fewer, Stronger Connections</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Fuzzy Matching</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.fuzzy_matching}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          fuzzy_matching: e.target.checked
                        }))}
                        className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Enable fuzzy matching</span>
                        <p className="text-xs text-gray-500">Match similar company names (e.g., "Google" and "Google LLC")</p>
                      </div>
                    </label>
                    
                    {settings.fuzzy_matching && (
                      <div className="ml-7 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-700">Similarity Threshold</label>
                          <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {settings.similarity_threshold}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="100"
                          step="5"
                          value={settings.similarity_threshold}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            similarity_threshold: parseInt(e.target.value)
                          }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Loose Matching</span>
                          <span>Exact Matching</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center space-x-2 mb-4">
              <Eye className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Privacy & Security</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Mask Email Addresses</span>
                  <p className="text-xs text-gray-500">Hide email addresses by default in the interface</p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.mask_emails}
                  onChange={(e) => setPrivacySettings(prev => ({
                    ...prev,
                    mask_emails: e.target.checked
                  }))}
                  className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Raw CSV Data</span>
                  <p className="text-xs text-gray-500">Allow viewing of original CSV data in node details</p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.show_raw_data}
                  onChange={(e) => setPrivacySettings(prev => ({
                    ...prev,
                    show_raw_data: e.target.checked
                  }))}
                  className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Local Processing</span>
                  <p className="text-xs text-gray-500">Process data locally when possible for enhanced privacy</p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.local_processing}
                  onChange={(e) => setPrivacySettings(prev => ({
                    ...prev,
                    local_processing: e.target.checked
                  }))}
                  className="w-4 h-4 text-linkedin-600 bg-gray-100 border-gray-300 rounded focus:ring-linkedin-500"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={resetToDefaults}
              className="btn-secondary"
            >
              Reset to Defaults
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPanel;