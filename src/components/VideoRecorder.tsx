import React from 'react';
import { VideoRecorder as RecorderPanel } from './Recorder/VideoRecorder';

/**
 * Top level wrapper kept for backwards compatible imports
 * (`components/VideoRecorder`). The implementation – including the accent
 * coloured controls and the AI feature toggles – lives in
 * `components/Recorder/VideoRecorder`.
 */
export const VideoRecorder: React.FC = () => <RecorderPanel />;

export default VideoRecorder;
