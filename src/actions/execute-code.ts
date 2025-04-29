"use server"

import { z } from "zod"

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

// Map our language IDs to Piston's language IDs
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
}

const ExecuteCodeSchema = z.object({
  language: z.enum(["javascript", "python", "java"]),
  code: z.string(),
  input: z.string().optional(),
})

export type ExecuteCodeResult = {
  success: boolean
  output: string
  error?: string
  executionTime?: number
}

export async function executeCode(data: z.infer<typeof ExecuteCodeSchema>): Promise<ExecuteCodeResult> {
  try {
    const { language, code, input } = ExecuteCodeSchema.parse(data)

    if (!LANGUAGE_MAP[language]) {
      return {
        success: false,
        output: "",
        error: `Language ${language} is not supported`,
      }
    }

    const { language: pistonLang, version } = LANGUAGE_MAP[language]

    const response = await fetch(PISTON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: pistonLang,
        version: version,
        files: [
          {
            name: getFileName(language),
            content: code,
          },
        ],
        stdin: input || "",
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const result = await response.json()

    // Check if execution was successful
    if (result.run && result.run.output !== undefined) {
      const executionTime = result.run.time || 0

      // Combine stdout and stderr if there's an error
      const output = result.run.stdout || ""
      const error = result.run.stderr || ""

      return {
        success: error.length === 0,
        output: output,
        error: error.length > 0 ? error : undefined,
        executionTime,
      }
    } else {
      return {
        success: false,
        output: "",
        error: "Execution failed with no output",
      }
    }
  } catch (error) {
    console.error("Code execution error:", error)
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

function getFileName(language: string): string {
  switch (language) {
    case "javascript":
      return "main.js"
    case "python":
      return "main.py"
    case "java":
      return "Main.java"
    default:
      return "code.txt"
  }
}
