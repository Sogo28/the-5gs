import { create } from "zustand";
import { CameraStore, defaultQualityPresets } from "@/definitions/stores";
import { useRtcStore } from "./rtcSore"

const maxWidth = 720;
const maxHeight = 1280;
const maxFps = 30;
const aspectRatio = maxHeight / maxWidth;

export const useCameraStore = create<CameraStore>((set, get) => ({
  availableCameras: [],
  selectedCamera: null,
  permissionGranted: false,
  error: null,
  cameraStream: null,
  mediaCapabilities: null,
  videoStats: null,
  videoQuality: "high", // Default video quality
  qualityPresets: defaultQualityPresets,
  // Actions to update the state
  setError: (error: string | null) => set({ error }),
  // Action to fetch and initialize cameras
  getAvailableCameras: async () => {
    try {
      console.log("Requesting camera permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately to release the camera
      stream.getTracks().forEach((track) => track.stop());

      // Get the list of available video input devices (cameras)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      // Setting the available cameras and the selected camera
      set((state) => ({
        availableCameras: videoDevices,
        selectedCamera: state.selectedCamera || (videoDevices[0]?.deviceId || null),
        permissionGranted: true,
        error: null,
      }));

      console.log("Available cameras:", videoDevices);
    } catch (err: any) {
      // Handle permission denied error
      if (err.name === "NotAllowedError") {
        console.error("Camera permissions denied");
        set({ permissionGranted: false, error: "Camera permissions denied" });
      } else if (err.name === "NotFoundError") {
        console.error("No camera found");
        set({ error: "No camera found" });
      } else {
        console.error("Unknown error:", err);
        set({ error: "Failed to access cameras" });
      }
    }
  },
  startCameraStream(videoQuality = 'high') {
    const qualityPresets = get().qualityPresets;
    const presets = qualityPresets[videoQuality as keyof typeof qualityPresets];
    const selectedCamera = get().selectedCamera;
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            height: presets.height,
            width: presets.width,
            frameRate: presets.fps,
          },
        });
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        const maxWidth = capabilities.width?.max ?? 720;
        const maxHeight = capabilities.height?.max ?? 1280;
        const maxFps = capabilities.frameRate?.max ?? 30;
        const aspectRatio = maxWidth / maxHeight;

        console.log("Camera stream started:", stream, "Capabilities:", capabilities);
        set({
          cameraStream: stream,
          mediaCapabilities: capabilities,
          videoStats: { width: presets.width, height: presets.height, fps: presets.fps },
          qualityPresets: {
            high: { width: 720, height: 1280, fps: 30 },
            medium: { width: 540, height: Math.round(540 * aspectRatio), fps: 30 },
            low: { width: 360, height: Math.round(360 * aspectRatio), fps: 15 },
          }
        });
        console.log(qualityPresets);
        resolve();
      } catch (err) {
        console.error("Error starting camera stream:", err);
        set({ error: "Failed to start camera stream" });
        reject(err);
      }
    });
  },
  stopCameraStream: () => {
    const cameraStream = get().cameraStream;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      set({ cameraStream: null });
    }
  },
  setVideoQuality: (quality: string) => {
    const isStreaming = useRtcStore.getState().isStreaming;
    if (isStreaming) {
      console.warn("Cannot change video quality while streaming. Please stop the stream first.");
      return;
    }
    set({ videoQuality: quality });
  },
  setCameraStream: (stream: MediaStream) => {
    set({ cameraStream: stream });
  },
  setSelectedCamera: async (cameraId: string) => {
    const stopCameraStream = get().stopCameraStream;
    const startCameraStream = get().startCameraStream;
    const videoQuality = get().videoQuality; // Get the current video quality
    stopCameraStream(); // Stop the current camera stream before changing the camera
    set({ selectedCamera: cameraId });
    await startCameraStream(videoQuality) // Start the new camera stream
  }
}));
