"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { useCameraStore } from "@/context/state/cameraStore"
import { useRtcStore } from "@/context/state/rtcSore"

interface SettingsFormValues {
  codec: string
  resolution: string
  frameRate: number
  selectedCamera: string
}

export function SettingsForm() {
  const [isSaving, setIsSaving] = useState(false)
  const setSelectedCamera = useCameraStore((state) => state.setSelectedCamera)
  const availableCameras = useCameraStore((state) => state.availableCameras)
  const setVideoQuality = useCameraStore((state) => state.setVideoQuality)
  const selectedCamera = useCameraStore((state) => state.selectedCamera)
  const videoQuality = useCameraStore((state) => state.videoQuality)
  const form = useForm<SettingsFormValues>({
    defaultValues: {
      codec: "H264",
      resolution: "high",
      frameRate: 30,
    },
  })

  function onSubmit(data: SettingsFormValues) {
    setIsSaving(true)
    console.log(data.selectedCamera)
    setVideoQuality(data.resolution)
    setSelectedCamera(data.selectedCamera)
    console.log("Settings saved:", data)
    setIsSaving(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* <FormField
          control={form.control}
          name="codec"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video Codec</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select codec" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="VP8">VP8</SelectItem>
                  <SelectItem value="VP9">VP9</SelectItem>
                  <SelectItem value="H264">H264</SelectItem>
                  <SelectItem value="AV1">AV1</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        /> */}

        {/* <FormField
          control={form.control}
          name="frameRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frame Rate (fps)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  {...field}
                  onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10))}
                />
              </FormControl>
            </FormItem>
          )}
        /> */}

        {
          availableCameras.length > 0 ? (
            <FormField
              control={form.control}
              name="selectedCamera"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camera Selection</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={selectedCamera || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Camera" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCameras.map((camera) => (
                        <SelectItem key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || `Camera ${camera.deviceId}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ) : (
            <div className="text-red-500">No cameras available</div>
          )
        }

        <FormField
          control={form.control}
          name="resolution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Camera Selection</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={videoQuality}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (480p)</SelectItem>
                  <SelectItem value="medium">Medium (720p)</SelectItem>
                  <SelectItem value="high">High (1080p)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  )
}
