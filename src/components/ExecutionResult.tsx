import { ScrollArea } from "./ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react"
import type { ExecuteCodeResult } from "../actions/execute-code"
import React from "react"

interface ExecutionResultProps {
  result: ExecuteCodeResult | null
  isLoading: boolean
}

export function ExecutionResult({ result, isLoading }: ExecutionResultProps) {
  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Executing code...</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex items-center justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  return (
    <Card className="mt-4">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Execution Result</CardTitle>
        <div className="flex items-center gap-2">
          {result.executionTime !== undefined && (
            <Badge variant="outline" className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {result.executionTime.toFixed(2)}s
            </Badge>
          )}
          <Badge variant={result.success ? "default" : "destructive"} className="flex items-center gap-1">
            {result.success ? (
              <>
                <CheckCircleIcon className="h-3 w-3" />
                Success
              </>
            ) : (
              <>
                <XCircleIcon className="h-3 w-3" />
                Error
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <ScrollArea className="h-full max-h-[200px] w-full rounded-md border bg-muted/50">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            {result.output || result.error || "No output"}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
