import { create } from "zustand";

import { RTCConnectionStore, defaultQualityPresets } from "@/definitions/stores";
import { useCameraStore } from "./cameraStore";

const maxWidth = 720;
const maxHeight = 1280;
const maxFps = 30;
const aspectRatio = maxHeight / maxWidth;

export const useRtcStore = create<RTCConnectionStore>((set, get) => ({
  peerConnection: null,
  connectionState: null,
  dataChannel: null,
  config: {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  },
  icegatheringstatechange: null,
  iceconnectionstatechange: null,
  signalingstatechange: null,
  remoteStream: null,
  error: null,
  isStreaming: false,
  arData: null,
  resolvingStream: false,
  negotiate: async () => {
    try {
      // Create SDP offer
      const pc = get().peerConnection;
      const qualityPresets = useCameraStore.getState().qualityPresets ?? defaultQualityPresets;

      if (!pc) {
        console.error("Peer connection is not initialized");
        set({ error: "Peer connection is not initialized" });
        return;
      }
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
        console.error("Local description is not set");
        set({ error: "Local description is not set" });
        return;
      }

      const videoStats = useCameraStore.getState().videoStats
      const videoQuality = useCameraStore.getState().videoQuality || "high"; // Default to high if not set
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
        console.error(`HTTP error! status: ${response.status}`);
        set({ error: `HTTP error! status: ${response.status}` });
        return;
      }

      // Receive and apply server response
      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      console.log("WebRTC negotiation successful!");
      set({ connectionState: "connected", isStreaming: true });
    } catch (error) {
      console.error("Error during WebRTC negotiation:", error);
      set({ isStreaming: false });
    }
  },
  createDataChannel: () => {
    const pc = get().peerConnection;
    if (pc) {
      const dataChannel = pc.createDataChannel("ar-data");
      dataChannel.onopen = () => {
        console.log("Data channel is open");
      };
      dataChannel.onclose = () => {
        console.log("❌ DataChannel closed");
      };
      dataChannel.onerror = (error) => {
        console.error("DataChannel error:", error);
      };
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // console.log("Received data from server:", data);
          // Handle marker data if available
          if (data.markers) {
            // console.log("AR Marker data:", data.markers);
            // Process marker data as needed
            set({ arData: data.markers });

          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };
      set({ dataChannel });
      console.log("Data channel created:", dataChannel);
    } else {
      console.error("Peer connection is not initialized");
    }
  },
  closeDataChannel: () => {
    const dataChannel = get().dataChannel;
    if (dataChannel) {
      dataChannel.close();
      set({ dataChannel: null });
    } else {
      console.error("Data channel is not initialized");
    }
  },
  createPeerConnection: () => {
    const config = get().config
    const pc = new RTCPeerConnection(config);

    pc.addEventListener("icegatheringstatechange", () => {
      set({ icegatheringstatechange: pc.iceGatheringState });
    });
    pc.addEventListener("iceconnectionstatechange", () => {
      set({ iceconnectionstatechange: pc.iceConnectionState });
    });
    pc.addEventListener("signalingstatechange", () => {
      set({ signalingstatechange: pc.signalingState });
    });
    pc.addEventListener("track", (event) => {
      console.log("Track event:", event);
      if (event.track.kind === "video") {
        // Set the received stream
        set({ remoteStream: new MediaStream(event.streams[0]) });
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

    set({ peerConnection: pc, connectionState: pc.connectionState });
    console.log("Peer connection state:", pc.connectionState);
    console.log("Peer connection created:", pc);
  },
  closePeerConnection: () => {
    const pc = get().peerConnection;
    if (!pc) return;

    // Close transceivers
    if (pc.getTransceivers()) {
      pc.getTransceivers().forEach((transceiver) => {
        if (transceiver.stop) {
          transceiver.stop();
        }
      });
    }

    // Close senders
    pc.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    // Close connection
    pc.close();
    set({ peerConnection: null, remoteStream: null });
  },
  startStreaming: async () => {
    try {
      set({ resolvingStream: true });
      const cameraStream = useCameraStore.getState().cameraStream;

      if (!cameraStream) {
        console.error("Camera stream is not initialized.") // Create peer connection if not already created
        return;
      }

      const pc = get().peerConnection;
      const createPeerConnection = get().createPeerConnection;
      const createDataChannel = get().createDataChannel;
      const negotiate = get().negotiate;

      if (!pc) {
        console.log("No peer connection found, creating a new one...");
        console.log("Creating data Channel...");
      }

      createPeerConnection(); // Create peer connection if not already created
      createDataChannel(); // Create data channel
      const currentPc = get().peerConnection;

      if (!currentPc) {
        console.error("Peer connection is not initialized after creation.");
        return;
      }

      cameraStream.getTracks().forEach((track) => {
        currentPc.addTrack(track, cameraStream);
      });


      await negotiate(); // Start negotiation

      console.log("Streaming started with camera stream:", cameraStream);
      set({ isStreaming: true, resolvingStream: false });
    } catch (error) {
      console.error("Error starting streaming:", error);
      set({ isStreaming: false, remoteStream: null, resolvingStream: false });
    }

  },
  stopStreaming: async () => {
    const closeDataChannel = get().closeDataChannel;
    const closePeerConnection = get().closePeerConnection;

    closeDataChannel(); // Close data channel if open
    closePeerConnection(); // Close peer connection

    set({ isStreaming: false, remoteStream: null });
    console.log("Streaming stopped and peer connection closed");
  },

}));