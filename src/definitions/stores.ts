export type CameraStore = {
  availableCameras: MediaDeviceInfo[];
  selectedCamera: string | null;
  permissionGranted: boolean;
  error: string | null;
  cameraStream: MediaStream | null;
  mediaCapabilities: MediaTrackCapabilities | null;
  videoStats: Record<string, number> | null;
  videoQuality: string; // Default video quality
  qualityPresets: Record<string, { width: number; height: number; fps: number }>;
  setVideoQuality: (quality: string) => void;
  setError: (error: string | null) => void;
  getAvailableCameras: () => Promise<void>;
  stopCameraStream: () => void;
  startCameraStream: (videoQuality?: string) => Promise<void>;
  setCameraStream: (stream: MediaStream) => void;
  setSelectedCamera: (cameraId: string) => Promise<void>;
};

export type RTCConnectionStore = {
  peerConnection: RTCPeerConnection | null;
  connectionState: string | null;
  dataChannel: RTCDataChannel | null;
  config: RTCConfiguration;
  icegatheringstatechange: string | null;
  iceconnectionstatechange: string | null;
  signalingstatechange: string | null;
  remoteStream: MediaStream | null;
  error: string | null;
  isStreaming: boolean;
  resolvingStream: boolean;
  arData: any;
  createPeerConnection: () => void;
  closePeerConnection: () => void;
  createDataChannel: () => void;
  closeDataChannel: () => void;
  negotiate: () => Promise<void>;
  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
};

const maxWidth = 720;
const maxHeight = 1280;
const maxFps = 30;
const aspectRatio = maxHeight / maxWidth;

export const defaultQualityPresets = {
  high: { width: 720, height: 1280, fps: 30 },
  medium: { width: 540, height: Math.round(540 * aspectRatio), fps: 30 },
  low: { width: 360, height: Math.round(360 * aspectRatio), fps: 15 }
};
// export const defaultQualityPresets = {
//   high: { width: maxWidth, height: maxHeight, fps: maxFps },
//   medium: {
//     width: Math.max(1, Math.floor(maxWidth * 0.75)),
//     height: Math.max(1, Math.floor(maxHeight * 0.75)),
//     fps: maxFps,
//   },
//   low: {
//     width: Math.max(1, Math.floor(maxWidth * 0.5)),
//     height: Math.max(1, Math.floor(maxHeight * 0.5)),
//     fps: maxFps,
//   },
// };