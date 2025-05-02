"use client"

import { useEffect, useState, useRef } from "react"
import { Menu, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SideNav } from "@/components/sidenav"
import VideoStream from "@/components/local-video-stream"
import { useCameraStore } from "@/context/state/cameraStore"
import { useRtcStore } from "@/context/state/rtcSore"

export default function Home() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null)

  const getCameras = useCameraStore((state) => state.getAvailableCameras)
  const isStreaming = useRtcStore((state) => state.isStreaming)
  const startStreaming = useRtcStore((state) => state.startStreaming)
  const stopStreaming = useRtcStore((state) => state.stopStreaming)
  const cameraError = useCameraStore((state) => state.error)
  const rtcError = useRtcStore((state) => state.error)
  const startCameraStream = useCameraStore((state) => state.startCameraStream)
  const resolvingStream = useRtcStore((state) => state.resolvingStream)


  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      getCameras()
      startCameraStream()
    }
    init()
  }, [])


  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Video Stream */}
      <VideoStream />

      {/* Hamburger menu button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="outline"
          size="icon"
          className="bg-black/30 backdrop-blur-sm border-white/20 hover:bg-black/50"
          onClick={() => setIsOpen(true)}
          disabled={isStreaming || resolvingStream}
        >
          <Settings className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Start AR button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <Button
          size="lg"
          className="font-bold text-lg px-8 py-6 bg-primary hover:bg-primary/90"
          onClick={!isStreaming ? startStreaming : stopStreaming}
          disabled={resolvingStream}
        >
          {isStreaming ? "Stop AR" : "Start AR"}
        </Button>
      </div>

      {/* Side Navigation */}
      <SideNav isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Error display */}
      {cameraError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-500/80 text-white px-4 py-2 rounded-md">
          {cameraError}
          <button
            className="ml-2 font-bold"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {rtcError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-500/80 text-white px-4 py-2 rounded-md">
          {rtcError}
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