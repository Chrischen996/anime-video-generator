'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import Button from './ui/Button';
import Select from './ui/Select';
import Modal from './ui/Modal';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const [settings, setSettings] = useState({
    defaultModel: state.settings.defaultModel,
    defaultResolution: state.settings.defaultResolution,
    defaultDuration: state.settings.defaultDuration,
    defaultAspectRatio: state.settings.defaultAspectRatio,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSettings({
      defaultModel: state.settings.defaultModel,
      defaultResolution: state.settings.defaultResolution,
      defaultDuration: state.settings.defaultDuration,
      defaultAspectRatio: state.settings.defaultAspectRatio,
    });
  }, [
    isOpen,
    state.settings.defaultModel,
    state.settings.defaultResolution,
    state.settings.defaultDuration,
    state.settings.defaultAspectRatio,
  ]);

  const handleSave = () => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        ...settings,
      },
    });

    onClose();
  };

  const resolutionOptions = [
    { value: '480p', label: '480p (Lite)' },
    { value: '720p', label: '720p (Lite)' },
    { value: '1080p', label: '1080p (Pro)' },
  ];

  const durationOptions = [
    { value: '5', label: '5 seconds' },
    { value: '10', label: '10 seconds' },
  ];

  const aspectRatioOptions = [
    { value: '16:9', label: '16:9 (Landscape)' },
    { value: '9:16', label: '9:16 (Portrait)' },
    { value: '1:1', label: '1:1 (Square)' },
  ];

  const modelOptions = [
    { value: 'fal-ai', label: 'Fal.ai Seedance' },
    { value: 'doubao', label: 'ByteDance Doubao 1.5 Pro' },
    { value: 'agnes', label: 'Agnes AI Video V2.0' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="space-y-6">
        {/* API Key Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">API Keys</h3>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">API Keys Are Server-Only</h4>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This app now reads <code>.env.local</code> and server environment variables only.
                    Set <code>FAL_API_KEY</code>, <code>DOUBAO_API_KEY</code>, and <code>AGNES_API_KEY</code>
                    on the server, then restart the dev server.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Default Settings Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Default Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Model"
              value={settings.defaultModel}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultModel: e.target.value as any,
                })
              }
              options={modelOptions}
            />

            <Select
              label="Resolution"
              value={settings.defaultResolution}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultResolution: e.target.value as any,
                })
              }
              options={resolutionOptions}
            />

            <Select
              label="Duration"
              value={settings.defaultDuration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultDuration: e.target.value as any,
                })
              }
              options={durationOptions}
            />

            <Select
              label="Aspect Ratio"
              value={settings.defaultAspectRatio}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultAspectRatio: e.target.value as any,
                })
              }
              options={aspectRatioOptions}
            />
          </div>
        </div>

        {/* Cost Information */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">
                Cost Information
              </h4>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  • 1080p Pro: ~$0.74 per 5-second video<br />
                  • 720p Lite: ~$0.18 per 5-second video<br />
                  • Monitor your usage to manage costs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Settings;
