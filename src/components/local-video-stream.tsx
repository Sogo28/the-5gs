"use client"

import { useEffect, useRef, useState } from "react";
import { useCameraStore } from "@/context/state/cameraStore";
import { useRtcStore } from "@/context/state/rtcSore";

export default function VideoStream() {

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isStreaming = useRtcStore((state) => state.isStreaming);
  const videoStream = useCameraStore((state) => state.cameraStream);

  useEffect(() => {
    if (!videoRef.current) return

    if (videoStream) {
      videoRef.current.srcObject = videoStream
    }
    else {
      videoRef.current.srcObject = null
    }

  }, [videoStream, isStreaming])

  return (
    <div className="absolute bg-black inset-0 w-full h-full">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-4">
          {error}
        </div>
      )}

      {videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="object-contain w-full h-full"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          No video stream available
        </div>
      )}

      <div className="absolute inset-0 bg-black/30" />

    </div>
  );
}

