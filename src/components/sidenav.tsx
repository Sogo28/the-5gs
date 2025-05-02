"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsForm } from "./settings-form"
import { useCameraStore } from "@/context/state/cameraStore"
import { useRtcStore } from "@/context/state/rtcSore"

interface SideNavProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function SideNav({ isOpen, setIsOpen }: SideNavProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />}

      {/* Side Navigation Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-background z-40 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <SettingsForm />
        </div>
      </div>
    </>
  )
}
