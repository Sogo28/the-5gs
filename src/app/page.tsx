"use client"

import { useEffect, useState, useRef } from "react"
import { Menu, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SideNav } from "@/components/sidenav"
import VideoStream from "@/components/video-stream"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as THREE from "three"

export default function Home() {
  const [isOpen, setIsOpen] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWebXRAvailable, setIsWebXRAvailable] = useState<boolean>(false)
  const [xrSession, setXrSession] = useState<XRSession | null>(null)
  const [iceGatheringState, setIceGatheringState] = useState<string>('');
  const [signalingState, setSignalingState] = useState<string>('');
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [connectionState, setConnectionState] = useState<string>('');
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [videoQuality, setVideoQuality] = useState<string>("high");
  const [videoStats, setVideoStats] = useState<{ width: number, height: number, fps: number } | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Quality presets
  const qualityPresets = {
    low: { width: 640, height: 480, fps: 15 },
    medium: { width: 1280, height: 720, fps: 30 },
    high: { width: 1920, height: 1080, fps: 30 }
  };

  // Get available cameras
  const getCameras = async () => {
    try {
      console.log("Requesting camera permissions...");
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)
      console.log("Available cameras:", videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId)
        setPermissionGranted(true)
        console.log("Selected camera:", videoDevices[0].label);
      }
    } catch (error) {
      setError("Failed to enumerate cameras")
      console.error("Error getting cameras:", error)
    }
  }

  // Get video stream from selected camera with quality preset
  const getVideoStream = async () => {
    if (!selectedCamera || !permissionGranted) return

    console.log("Getting video stream with quality:", videoQuality);

    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Apply quality preset
      const preset = qualityPresets[videoQuality as keyof typeof qualityPresets];

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedCamera },
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.fps },
        },
      })

      // Get actual stream settings
      const videoTrack = newStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      setVideoStats({
        width: settings.width || preset.width,
        height: settings.height || preset.height,
        fps: settings.frameRate || preset.fps,
      });

      console.log("Stream obtained with settings:", settings);
      setStream(newStream)
      console.log("Video stream started")
      return newStream
    } catch (error) {
      setError("Failed to access camera")
      console.error("Camera access error:", error)
      return null;
    }
  }

  const createPeerConnection = () => {
    const config: RTCConfiguration = {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    };

    const pc = new RTCPeerConnection(config);

    // Create data channel for AR data and quality settings
    const channel = pc.createDataChannel("ar-data", {
      ordered: true,
      maxPacketLifeTime: 3000,
    });

    channel.onopen = () => {
      console.log("✅ DataChannel open");
      setDataChannel(channel);

      // Send initial quality configuration when channel opens
      if (videoStats) {
        sendQualityConfig(channel, videoStats.width, videoStats.height, videoStats.fps, videoQuality);
      }
    };

    channel.onclose = () => {
      console.log("❌ DataChannel closed");
      setDataChannel(null);
    };

    channel.onerror = (error) => {
      console.error("DataChannel error:", error);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received data from server:", data);

        // Handle marker data if available
        if (data.markers) {
          console.log("AR Marker data:", data.markers);
          // Process marker data as needed
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    // Add event listeners for debugging
    pc.addEventListener("icegatheringstatechange", () => {
      setIceGatheringState(pc.iceGatheringState);
    });

    pc.addEventListener("iceconnectionstatechange", () => {
      setConnectionState(pc.iceConnectionState);
    });

    pc.addEventListener("signalingstatechange", () => {
      setSignalingState(pc.signalingState);
    });

    pc.addEventListener("track", (event) => {
      if (event.track.kind === "video") {
        // Set the received stream
        setStream(event.streams[0]);
        console.log("Received remote stream:", event.streams[0]);

        // Get stats periodically to monitor quality
        const statsInterval = setInterval(() => {
          if (pc.connectionState !== "connected") {
            clearInterval(statsInterval);
            return;
          }

          pc.getStats(event.track).then(stats => {
            stats.forEach(report => {
              if (report.type === "inbound-rtp" && report.kind === "video") {
                console.log("Video stats:", report);
                // You could update UI with stats if needed
              }
            });
          });
        }, 5000); // Check every 5 seconds
      }
    });

    return pc;
  };

  // Function to send quality configuration through data channel
  const sendQualityConfig = (
    channel: RTCDataChannel,
    width: number,
    height: number,
    fps: number,
    quality: string
  ) => {
    if (channel.readyState === "open") {
      const config = {
        width: width,
        height: height,
        fps: fps,
        quality: quality,
        // Estimate focal length (typical value is around 1.2 * max dimension)
        focal_length_x: Math.round(1.2 * width),
        focal_length_y: Math.round(1.2 * height)
      };

      channel.send('config:' + JSON.stringify(config));
      console.log("Sent quality configuration:", config);
    }
  };

  // Handle quality change
  const handleQualityChange = (newQuality: string) => {
    setVideoQuality(newQuality);

    if (dataChannel && dataChannel.readyState === "open" && videoStats) {
      const preset = qualityPresets[newQuality as keyof typeof qualityPresets];
      sendQualityConfig(dataChannel, preset.width, preset.height, preset.fps, newQuality);
    }

    // If we're already streaming, restart with new quality
    if (isStreaming) {
      stopStreaming();
      setTimeout(() => {
        startStreaming();
      }, 500);
    }
  };

  const negotiate = async (pc: RTCPeerConnection) => {
    try {
      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });

      if (!pc.localDescription) {
        throw new Error("Local description is null");
      }

      // Get current video stream settings
      const currentSettings = videoStats || qualityPresets[videoQuality as keyof typeof qualityPresets];

      // Prepare data to send to server
      const offerData = {
        sdp: pc.localDescription.sdp,
        type: pc.localDescription.type,
        video_transform: 'ar_marker',
        video_params: {
          width: currentSettings.width,
          height: currentSettings.height,
          fps: currentSettings.fps,
          quality: videoQuality,
          focal_length_x: Math.round(1.2 * currentSettings.width),
          focal_length_y: Math.round(1.2 * currentSettings.height)
        }
      };

      console.log("Sending offer with video params:", offerData.video_params);

      // Send offer to server
      const response = await fetch("/api/offer", {
        method: "POST",
        body: JSON.stringify(offerData),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Receive and apply server response
      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      console.log("WebRTC negotiation successful!");
    } catch (error) {
      console.error("Error during WebRTC negotiation:", error);
      setIsStreaming(false);
    }
  };

  const startStreaming = async () => {
    try {
      // 1. Get local video stream with current quality settings
      const stream = await getVideoStream();
      if (!stream) {
        throw new Error("Could not access camera");
      }

      // 2. Create new peer connection
      // const pc = createPeerConnection();
      // setPeerConnection(pc);

      // 3. Add video tracks to peer connection
      // stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Start WebRTC negotiation
      // await negotiate(pc);

      // 5. Update streaming state
      setIsStreaming(true);
    } catch (error) {
      console.error("Error starting streaming:", error);
      setError("Failed to start streaming");
    }
  };

  const stopStreaming = () => {
    if (!peerConnection) return;

    if (dataChannel) {
      dataChannel.close();
      setDataChannel(null);
    }

    // Close transceivers
    if (peerConnection.getTransceivers) {
      peerConnection.getTransceivers().forEach((transceiver) => {
        if (transceiver.stop) {
          transceiver.stop();
        }
      });
    }

    // Close senders
    peerConnection.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    // Close connection
    peerConnection.close();
    setPeerConnection(null);
    setIsStreaming(false);
  };

  const initXR = async () => {
    if (!isWebXRAvailable || !stream) return;

    try {
      const session = await navigator.xr!.requestSession("immersive-ar");
      setXrSession(session);

      // Set up Three.js renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      document.body.appendChild(renderer.domElement);

      // Initialize WebGL context for XR
      const gl = renderer.getContext();
      await gl.makeXRCompatible();

      // Create reference space
      const referenceSpace = await session.requestReferenceSpace("local");

      // Set up render state
      await session.updateRenderState({
        baseLayer: new XRWebGLLayer(session, gl)
      });

      // Create scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      scene.add(camera);

      // Add AR content
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      );
      scene.add(cube);

      // Frame loop
      const onXRFrame: XRFrameRequestCallback = (time, frame) => {
        const pose = frame.getViewerPose(referenceSpace);
        if (pose) {
          const view = pose.views[0];

          // Update camera matrices
          camera.matrix.fromArray(view.transform.matrix);
          camera.projectionMatrix.fromArray(view.projectionMatrix);
          camera.updateMatrixWorld(true);

          renderer.render(scene, camera);
        }
        session.requestAnimationFrame(onXRFrame);
      };
      session.requestAnimationFrame(onXRFrame);

      session.addEventListener("end", () => {
        renderer.dispose();
        document.body.removeChild(renderer.domElement);
        setXrSession(null);
      });

    } catch (error) {
      console.error("AR session error:", error);
      setError("Failed to start AR");
    }
  };

  const checkWebXRSupport = async () => {
    if (navigator.xr) {
      try {
        // Check if immersive-ar mode is supported
        const supported = await navigator.xr.isSessionSupported('immersive-ar')
        setIsWebXRAvailable(supported)
        console.log(`WebXR AR support: ${supported}`)
      } catch (error) {
        console.error("Error checking WebXR support:", error)
        setIsWebXRAvailable(false)
      }
    } else {
      console.error("WebXR not supported by browser")
      setIsWebXRAvailable(false)
    }
  }

  // Initialize on component mount
  useEffect(() => {
    getCameras()
    checkWebXRSupport()
  }, [])

  // Create quality settings UI
  const QualitySettings = () => (
    <div className="absolute top-4 left-4 z-20 p-4 bg-black/30 backdrop-blur-sm rounded-lg border border-white/20">
      <div className="flex flex-col gap-2">
        <h3 className="text-white text-sm font-medium">Video Quality</h3>
        <Select
          value={videoQuality}
          onValueChange={handleQualityChange}
        >
          <SelectTrigger className="w-[180px] bg-black/50 text-white border-white/20">
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent className="bg-black text-white">
            <SelectItem value="low">Low (480p)</SelectItem>
            <SelectItem value="medium">Medium (720p)</SelectItem>
            <SelectItem value="high">High (1080p)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {videoStats && (
        <div className="mt-3 text-white/80 text-xs">
          <div>Resolution: {videoStats.width}×{videoStats.height}</div>
          <div>Frame rate: {videoStats.fps} FPS</div>
          <div>Connection: {connectionState || "Not connected"}</div>
        </div>
      )}
    </div>
  );

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Video Stream */}
      {stream && <VideoStream videoStream={stream} />}

      {/* Settings button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="outline"
          size="icon"
          className="bg-black/30 backdrop-blur-sm border-white/20 hover:bg-black/50"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Quality settings panel */}
      {showSettings && <QualitySettings />}

      {/* Hamburger menu button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="outline"
          size="icon"
          className="bg-black/30 backdrop-blur-sm border-white/20 hover:bg-black/50"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Start AR button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <Button
          size="lg"
          className="font-bold text-lg px-8 py-6 bg-primary hover:bg-primary/90"
          onClick={!isStreaming ? startStreaming : stopStreaming}
        >
          {isStreaming ? "Stop AR" : "Start AR"}
        </Button>
      </div>

      {/* Side Navigation */}
      <SideNav isOpen={isOpen} setIsOpen={setIsOpen} availableCameras={availableCameras} setSelectedCamera={setSelectedCamera} />

      {/* Error display */}
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-500/80 text-white px-4 py-2 rounded-md">
          {error}
          <button
            className="ml-2 font-bold"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
    </main>
  )
}