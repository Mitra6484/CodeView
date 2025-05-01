"use server"

import { z } from "zod"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const AnalyzeCodeSchema = z.object({
  code: z.string(),
  language: z.string(),
  questionTitle: z.string(),
  questionDescription: z.string(),
})

export type CodeAnalysisResult = {
  isPlagiarized: boolean
  confidence: number // 0-100
  reasoning: string
  suggestions?: string
}

export async function analyzeCode(data: z.infer<typeof AnalyzeCodeSchema>): Promise<CodeAnalysisResult> {
  try {
    const { code, language, questionTitle, questionDescription } = AnalyzeCodeSchema.parse(data)

    // Skip analysis if no API key is available (for development)
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found. Skipping plagiarism check.")
      return {
        isPlagiarized: false,
        confidence: 0,
        reasoning: "API key not configured. Analysis skipped.",
      }
    }

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" })

    // Prepare the prompt for Gemini
    const prompt = `
You are an expert code reviewer for a coding interview platform. Your task is to analyze the following code submission and determine if it appears to be plagiarized or if the candidate is cheating.

Question Title: ${questionTitle}
Question Description: ${questionDescription}
Programming Language: ${language}

Submitted Code:
\`\`\`${language}
${code}
\`\`\`

Please analyze this code and provide:
1. Is this code likely plagiarized or does it show signs of cheating? (Yes/No)
2. Confidence level in your assessment (0-100)
3. Reasoning for your assessment
4. If applicable, suggestions for the interviewer

Focus on these indicators of potential plagiarism:
- Code that's unnecessarily complex or advanced for the problem
- Solutions that use algorithms or approaches not typically known by candidates
- Unusual variable names or commenting styles
- Code that solves more than what was asked
- Patterns that match common online solutions for this problem

Provide your analysis in JSON format with the following structure exactly:
{
  "isPlagiarized": boolean,
  "confidence": number,
  "reasoning": "string",
  "suggestions": "string"
}

Make sure the response is valid JSON that can be parsed.
`

    // Call Gemini API
    const result = await model.generateContent(prompt)
    const response = await result.response
    const textResponse = response.text()

    // Extract JSON from the response
    // Gemini might wrap the JSON in markdown code blocks or add extra text
    let jsonStr = textResponse

    // Try to extract JSON if it's wrapped in code blocks
    const jsonMatch = textResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1]
    }

    try {
      const analysis = JSON.parse(jsonStr) as CodeAnalysisResult
      return {
        isPlagiarized: analysis.isPlagiarized,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        suggestions: analysis.suggestions,
      }
    } catch (error) {
      console.error("Failed to parse Gemini response:", error)
      console.log("Raw response:", textResponse)

      // Fallback: Try to extract information manually if JSON parsing fails
      const isPlagiarized = /plagiarized.*?:\s*true/i.test(textResponse) || /is.*?plagiarized.*?yes/i.test(textResponse)

      return {
        isPlagiarized,
        confidence: isPlagiarized ? 70 : 30,
        reasoning: "Failed to parse AI response properly. Please review the code manually.",
        suggestions: "Consider running the analysis again or manually reviewing the submission.",
      }
    }
  } catch (error) {
    console.error("Code analysis error:", error)
    return {
      isPlagiarized: false,
      confidence: 0,
      reasoning: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
