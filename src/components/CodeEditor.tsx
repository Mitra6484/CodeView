"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"
import { LANGUAGES } from "@/constants"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { AlertCircleIcon, BookIcon, LightbulbIcon, PlayIcon } from "lucide-react"
import Editor from "@monaco-editor/react"
import LoaderUI from "./LoaderUI"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Textarea } from "./ui/textarea"
import { executeCode, type ExecuteCodeResult } from "../actions/execute-code"
import { ExecutionResult } from "./ExecutionResult"

type Question = Doc<"questions">

interface Example {
  input: string
  output: string
  explanation?: string
}

interface Constraint {
  text: string
}

function CodeEditor() {
  const questions = useQuery(api.questions.getAllQuestions)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [language, setLanguage] = useState<"javascript" | "python" | "java">(LANGUAGES[0].id)
  const [code, setCode] = useState("")
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecuteCodeResult | null>(null)

  const selectedQuestion = selectedQuestionId ? questions?.find((q: Question) => q._id === selectedQuestionId) : questions?.[0]

  useEffect(() => {
    if (questions && questions.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questions[0]._id)
    }
  }, [questions, selectedQuestionId])

  useEffect(() => {
    if (selectedQuestion && selectedQuestion.starterCode[language]) {
      setCode(selectedQuestion.starterCode[language])
    }
  }, [selectedQuestion, language])

  const handleQuestionChange = (questionId: string) => {
    setSelectedQuestionId(questionId)
    const question = questions?.find((q: Question) => q._id === questionId)
    if (question && question.starterCode[language]) {
      setCode(question.starterCode[language])
    }
  }

  const handleLanguageChange = (newLanguage: "javascript" | "python" | "java") => {
    if (selectedQuestion && selectedQuestion.supportedLanguages.includes(newLanguage)) {
      setLanguage(newLanguage)
      setCode(selectedQuestion.starterCode[newLanguage] || "")
    }
  }

  const handleRunCode = async () => {
    setIsExecuting(true)
    setActiveTab("output")

    try {
      const result = await executeCode({
        language,
        code,
        input,
      })

      setExecutionResult(result)
    } catch (error) {
      console.error("Failed to execute code:", error)
      setExecutionResult({
        success: false,
        output: "",
        error: "Failed to execute code. Please try again.",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  if (!questions) return <LoaderUI />
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem-1px)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No questions available</h2>
          <p className="text-muted-foreground">Please add questions in the dashboard to start coding.</p>
        </div>
      </div>
    )
  }

  if (!selectedQuestion) return <LoaderUI />

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-[calc(100vh-4rem-1px)]">
      {/* QUESTION SECTION */}
      <ResizablePanel>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight">{selectedQuestion.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Choose your language and solve the problem</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedQuestionId || ""} onValueChange={handleQuestionChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {questions.map((q: Question) => (
                        <SelectItem key={q._id} value={q._id}>
                          {q.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <img src={`/${language}.png`} alt={language} className="w-5 h-5 object-contain" />
                          {LANGUAGES.find((l) => l.id === language)?.name}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.filter((lang) => selectedQuestion.supportedLanguages.includes(lang.id)).map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          <div className="flex items-center gap-2">
                            <img src={`/${lang.id}.png`} alt={lang.name} className="w-5 h-5 object-contain" />
                            {lang.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PROBLEM DESC. */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <BookIcon className="h-5 w-5 text-primary/80" />
                  <CardTitle>Problem Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PROBLEM EXAMPLES */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full w-full rounded-md border">
                    <div className="p-4 space-y-4">
                      {selectedQuestion.examples.map((example: Example, index: number) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">Example {index + 1}:</p>
                          <ScrollArea className="h-full w-full rounded-md">
                            <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                              <div>Input: {example.input}</div>
                              <div>Output: {example.output}</div>
                              {example.explanation && (
                                <div className="pt-2 text-muted-foreground">Explanation: {example.explanation}</div>
                              )}
                            </pre>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                    <ScrollBar />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* CONSTRAINTS */}
              {selectedQuestion.constraints && selectedQuestion.constraints.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <AlertCircleIcon className="h-5 w-5 text-blue-500" />
                    <CardTitle>Constraints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1.5 text-sm marker:text-muted-foreground">
                      {selectedQuestion.constraints.map((constraint: string, index: number) => (
                        <li key={index} className="text-muted-foreground">
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* CODE EDITOR */}
      <ResizablePanel defaultSize={60} maxSize={100}>
        <div className="h-full flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage={language}
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 18,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                wordWrap: "on",
                wrappingIndent: "indent",
              }}
            />
          </div>

          <div className="border-t border-border bg-background">
            <div className="flex items-center justify-between p-2 bg-muted/30">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "input" | "output")}
                className="w-full"
              >
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="input">Input</TabsTrigger>
                    <TabsTrigger value="output">Output</TabsTrigger>
                  </TabsList>
                  <Button onClick={handleRunCode} disabled={isExecuting} size="sm" className="mr-2">
                    <PlayIcon className="h-4 w-4 mr-1" />
                    {isExecuting ? "Running..." : "Run Code"}
                  </Button>
                </div>

                <TabsContent value="input" className="p-2">
                  <Textarea
                    placeholder="Enter input for your code here..."
                    className="min-h-[100px] font-mono text-sm"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </TabsContent>
                <TabsContent value="output" className="p-2">
                  <div className="max-h-[200px] overflow-auto">
                    <ExecutionResult result={executionResult} isLoading={isExecuting} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default CodeEditor
