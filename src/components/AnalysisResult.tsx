import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from "lucide-react"
import type { CodeAnalysisResult } from "../actions/analyze-code"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { ScrollArea } from "./ui/scroll-area"

interface AnalysisResultProps {
  result: CodeAnalysisResult | null
  isLoading: boolean
}

export function AnalysisResult({ result, isLoading }: AnalysisResultProps) {
  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Analyzing code...</CardTitle>
          <CardDescription>Our AI is checking your submission</CardDescription>
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

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return "destructive"
    if (confidence >= 50) return "secondary"
    return "default"
  }

  return (
    <Card className="mt-4">
      <ScrollArea className="h-[300px]">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">AI Analysis Result</CardTitle>
            <Badge variant={result.isPlagiarized ? "destructive" : "default"} className="flex items-center gap-1">
              {result.isPlagiarized ? (
                <>
                  <AlertCircleIcon className="h-3 w-3" />
                  Potential Plagiarism
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-3 w-3" />
                  Original Work
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            Confidence:
            <Badge variant={getConfidenceBadge(result.confidence)} className="ml-2">
              {result.confidence}%
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <div className="space-y-4 pr-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Analysis:</h4>
              <p className="text-sm text-muted-foreground">{result.reasoning}</p>
            </div>

            {result.suggestions && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Suggestions</AlertTitle>
                <AlertDescription>{result.suggestions}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  )
}
