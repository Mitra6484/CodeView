"use client"

import {
  CallControls,
  CallingState,
  CallParticipantsList,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk"
import { LayoutListIcon, LoaderIcon, UsersIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Button } from "./ui/button"
import EndCallButton from "./EndCallButton"
import CodeEditor from "./CodeEditor"
import { PlagiarismAlert } from "./PlagiarismAlert"
import type { CodeAnalysisResult } from "../actions/analyze-code"
import toast from "react-hot-toast"

function MeetingRoom() {
  const router = useRouter()
  const [layout, setLayout] = useState<"grid" | "speaker">("speaker")
  const [showParticipants, setShowParticipants] = useState(false)
  const { useCallCallingState } = useCallStateHooks()
  const [isPlagiarismAlertOpen, setIsPlagiarismAlertOpen] = useState(false)
  const [plagiarismResult, setPlagiarismResult] = useState<CodeAnalysisResult | null>(null)
  const call = useCall()

  const callingState = useCallCallingState()

  useEffect(() => {
    if (!call) return

    // Listen for analysis results from other participants
    const handleAnalysisResult = (event: any) => {
      if (event.type === 'analysis-result') {
        const result = event.data as CodeAnalysisResult
        if (result.isPlagiarized && result.confidence > 70) {
          setPlagiarismResult(result)
          setIsPlagiarismAlertOpen(true)
        }
      }
    }

    call.on('custom', handleAnalysisResult)

    return () => {
      call.off('custom', handleAnalysisResult)
    }
  }, [call])

  // This function will be passed to the CodeEditor component
  const handleCodeAnalysisResult = (result: CodeAnalysisResult) => {
    // Broadcast the analysis result to all participants
    if (call) {
      call.sendCustomEvent({
        type: 'analysis-result',
        data: result
      })
    }

    // If plagiarism is detected with high confidence, show the alert
    if (result.isPlagiarized && result.confidence > 70) {
      setPlagiarismResult(result)
      setIsPlagiarismAlertOpen(true)
    }
  }

  const handleFlagForReview = () => {
    // Here you would implement the logic to flag this interview for review
    // This could involve saving to your database, sending a notification, etc.
    toast.success("A candidate has requested to review their code submission", {
      duration: 5000
    })
    setIsPlagiarismAlertOpen(false)
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem-1px)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={35} minSize={25} maxSize={100} className="relative">
          {/* VIDEO LAYOUT */}
          <div className="absolute inset-0">
            {layout === "grid" ? <PaginatedGridLayout /> : <SpeakerLayout />}

            {/* PARTICIPANTS LIST OVERLAY */}
            {showParticipants && (
              <div className="absolute right-0 top-0 h-full w-[300px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden">
                <div className="h-full p-4">
                  <CallParticipantsList onClose={() => setShowParticipants(false)} />
                </div>
              </div>
            )}
          </div>

          {/* VIDEO CONTROLS */}
          <div className="absolute bottom-4 left-0 right-0">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 flex-wrap justify-center px-4">
                <CallControls onLeave={() => router.push("/")} />

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="size-10">
                        <LayoutListIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setLayout("grid")}>Grid View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLayout("speaker")}>Speaker View</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={() => setShowParticipants(!showParticipants)}
                  >
                    <UsersIcon className="size-4" />
                  </Button>

                  <EndCallButton />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={25}>
          <CodeEditor onAnalysisResult={handleCodeAnalysisResult} />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Plagiarism Alert Dialog */}
      {plagiarismResult && (
        <PlagiarismAlert
          isOpen={isPlagiarismAlertOpen}
          onOpenChange={setIsPlagiarismAlertOpen}
          result={plagiarismResult}
          onConfirm={handleFlagForReview}
        />
      )}
    </div>
  )
}
export default MeetingRoom
