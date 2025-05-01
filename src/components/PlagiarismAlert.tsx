"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircleIcon } from "lucide-react"
import type { CodeAnalysisResult } from "../actions/analyze-code"
import { ScrollArea } from "./ui/scroll-area"

interface PlagiarismAlertProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  result: CodeAnalysisResult
  onConfirm: () => void
}

export function PlagiarismAlert({ isOpen, onOpenChange, result, onConfirm }: PlagiarismAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[80vh] overflow-hidden">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircleIcon className="h-5 w-5" />
            <AlertDialogTitle>Potential Plagiarism Detected</AlertDialogTitle>
          </div>
          <ScrollArea className="max-h-[60vh] pr-4">
            <AlertDialogDescription className="space-y-4">
              <p>
                Our AI has detected potential plagiarism in the submitted code with a confidence level of{" "}
                <span className="font-medium">{result.confidence}%</span>.
              </p>
              <div className="text-sm border-l-4 border-destructive pl-4 py-2 bg-destructive/10">
                <p className="font-medium">Analysis:</p>
                <p className="text-muted-foreground">{result.reasoning}</p>
              </div>
              {result.suggestions && (
                <div className="text-sm">
                  <p className="font-medium">Suggestions:</p>
                  <p className="text-muted-foreground">{result.suggestions}</p>
                </div>
              )}
              <p>How would you like to proceed with this interview?</p>
            </AlertDialogDescription>
          </ScrollArea>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Dismiss</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Flag for Review</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
