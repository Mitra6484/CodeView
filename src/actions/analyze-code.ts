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

    // Check for API key in production
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured in environment variables")
      return {
        isPlagiarized: false,
        confidence: 0,
        reasoning: "Code analysis service is not properly configured. Please contact support.",
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

Please analyze this code thoroughly and provide a detailed assessment. Consider the following aspects:

1. Code Structure and Style:
   - Check for inconsistent coding style (e.g., mixing camelCase and snake_case)
   - Look for unusual or non-standard variable/function naming patterns
   - Analyze comment style and placement
   - Check for unusual import patterns or library usage

2. Algorithm and Implementation:
   - Compare the solution's complexity with the problem requirements
   - Look for advanced algorithms or data structures that seem out of place
   - Check for unnecessary optimization or over-engineering
   - Analyze if the solution solves more than what was asked

3. Common Plagiarism Indicators:
   - Check for code that matches known online solutions
   - Look for boilerplate code that seems copied
   - Analyze if the code shows signs of being written by multiple people
   - Check for unusual or non-standard error handling patterns
   - Look for code that doesn't match the candidate's experience level

4. Code Quality and Consistency:
   - Check for inconsistent formatting
   - Look for mixed language patterns (e.g., Python code with Java-style comments)
   - Analyze if the code follows best practices for the language
   - Check for unusual or non-standard library usage

Please provide your analysis in JSON format with the following structure exactly:
{
  "isPlagiarized": boolean,
  "confidence": number (0-100),
  "reasoning": "Detailed explanation of why you believe the code is or isn't plagiarized",
  "suggestions": "Specific suggestions for the interviewer, including what to look for in follow-up questions"
}

Make sure to:
- Be thorough in your analysis
- Consider multiple factors before making a determination
- Provide specific examples from the code to support your assessment
- Suggest follow-up questions for the interviewer to verify authenticity

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
    // Return a more user-friendly error message
    return {
      isPlagiarized: false,
      confidence: 0,
      reasoning: "Failed to analyze code. Please try again later or contact support if the issue persists.",
      suggestions: "The code analysis service is currently unavailable. You may proceed with manual review.",
    }
  }
}
