import React, { useState, useEffect, useRef } from 'react';
import { FaceDetection } from './FaceDetection';
import { FacialLandmarkDetection } from './FacialLandmarkDetection';
import { Settings, Layers, Sliders, Monitor, Eye } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface AdvancedFaceRecognitionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
}

export const AdvancedFaceRecognition: React.FC<AdvancedFaceRecognitionProps> = ({
  videoRef,
  enabled
}) => {
  const [settings, setSettings] = useState({
    faceDetection: true,
    faceLandmarks: true,
    maxFaces: 5,
    minConfidence: 0.7,
    showBoundingBox: true,
    showLandmarks: true,
    showContours: true,
    showIris: true,
    meshColor: '#E44E51',
    contourColor: '#00FFFF', 
    irisColor: '#FFFFFF'
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleFaceDetected = (faces: any[]) => {
    setDetectedFaces(faces);
  };

  const handleLandmarksDetected = (faces: any[]) => {
    // Additional processing if needed
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!enabled) return null;

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
      {/* AI Features Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-auto">
        <div className="flex space-x-2">
          <Tooltip content="Toggle detection settings">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-black/50 rounded-full text-white"
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip content={settings.faceDetection ? "Disable face detection" : "Enable face detection"}>
            <button
              onClick={() => toggleSetting('faceDetection')}
              className={`p-2 rounded-full text-white ${
                settings.faceDetection ? 'bg-[#E44E51]/80' : 'bg-black/50'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip content={settings.faceLandmarks ? "Disable facial landmarks" : "Enable facial landmarks"}>
            <button
              onClick={() => toggleSetting('faceLandmarks')}
              className={`p-2 rounded-full text-white ${
                settings.faceLandmarks ? 'bg-[#E44E51]/80' : 'bg-black/50'
              }`}
            >
              <Layers className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 w-72 pointer-events-auto">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Sliders className="w-4 h-4 mr-2" />
            Face Recognition Settings
          </h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium">Detection Settings</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Faces</label>
                  <select
                    className="w-full text-sm rounded border-gray-300"
                    value={settings.maxFaces}
                    onChange={(e) => updateSetting('maxFaces', Number(e.target.value))}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Confidence</label>
                  <select
                    className="w-full text-sm rounded border-gray-300"
                    value={settings.minConfidence}
                    onChange={(e) => updateSetting('minConfidence', Number(e.target.value))}
                  >
                    <option value="0.5">50%</option>
                    <option value="0.7">70%</option>
                    <option value="0.9">90%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">Visualization</label>
              <div className="grid grid-cols-2 gap-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showBoundingBox"
                    checked={settings.showBoundingBox}
                    onChange={() => toggleSetting('showBoundingBox')}
                    className="rounded text-[#E44E51] mr-2"
                  />
                  <label htmlFor="showBoundingBox" className="text-xs">Bounding Box</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showLandmarks"
                    checked={settings.showLandmarks}
                    onChange={() => toggleSetting('showLandmarks')}
                    className="rounded text-[#E44E51] mr-2"
                  />
                  <label htmlFor="showLandmarks" className="text-xs">Landmarks</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showContours"
                    checked={settings.showContours}
                    onChange={() => toggleSetting('showContours')}
                    className="rounded text-[#E44E51] mr-2"
                  />
                  <label htmlFor="showContours" className="text-xs">Contours</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showIris"
                    checked={settings.showIris}
                    onChange={() => toggleSetting('showIris')}
                    className="rounded text-[#E44E51] mr-2"
                  />
                  <label htmlFor="showIris" className="text-xs">Iris</label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">Colors</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mesh</label>
                  <input
                    type="color"
                    value={settings.meshColor}
                    onChange={(e) => updateSetting('meshColor', e.target.value)}
                    className="w-full h-8 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contours</label>
                  <input
                    type="color"
                    value={settings.contourColor}
                    onChange={(e) => updateSetting('contourColor', e.target.value)}
                    className="w-full h-8 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Iris</label>
                  <input
                    type="color"
                    value={settings.irisColor}
                    onChange={(e) => updateSetting('irisColor', e.target.value)}
                    className="w-full h-8 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 bg-[#E44E51] text-white rounded-lg"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Face Detection */}
      {settings.faceDetection && (
        <FaceDetection
          videoRef={videoRef}
          enabled={enabled && settings.faceDetection}
          onFacesDetected={handleFaceDetected}
          settings={{
            minConfidence: settings.minConfidence,
            maxFaces: settings.maxFaces,
            drawBoxes: settings.showBoundingBox
          }}
        />
      )}

      {/* Facial Landmark Detection */}
      {settings.faceLandmarks && (
        <FacialLandmarkDetection
          videoRef={videoRef}
          enabled={enabled && settings.faceLandmarks}
          onFacesDetected={handleLandmarksDetected}
          settings={{
            minConfidence: settings.minConfidence,
            maxFaces: settings.maxFaces,
            drawMesh: settings.showLandmarks,
            drawContours: settings.showContours,
            drawIris: settings.showIris,
            meshColor: settings.meshColor,
            contourColor: settings.contourColor,
            irisColor: settings.irisColor
          }}
        />
      )}

      {/* Info Panel */}
      {detectedFaces.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded-lg text-xs">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Detected {detectedFaces.length} {detectedFaces.length === 1 ? 'face' : 'faces'}</span>
          </div>
        </div>
      )}
    </div>
  );
};