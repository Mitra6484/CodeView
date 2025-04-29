import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Get all questions
export const getAllQuestions = query({
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect()
    return questions
  },
})

// Get a specific question by ID
export const getQuestionById = query({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id)
    return question
  },
})

// Add a new question
export const addQuestion = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    examples: v.array(
      v.object({
        input: v.string(),
        output: v.string(),
        explanation: v.optional(v.string()),
      }),
    ),
    constraints: v.optional(v.array(v.string())),
    supportedLanguages: v.array(v.string()),
    starterCode: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    return await ctx.db.insert("questions", {
      title: args.title,
      description: args.description,
      examples: args.examples,
      constraints: args.constraints,
      supportedLanguages: args.supportedLanguages,
      starterCode: args.starterCode,
      createdBy: identity.subject,
    })
  },
})

// Update an existing question
export const updateQuestion = mutation({
  args: {
    id: v.id("questions"),
    title: v.string(),
    description: v.string(),
    examples: v.array(
      v.object({
        input: v.string(),
        output: v.string(),
        explanation: v.optional(v.string()),
      }),
    ),
    constraints: v.optional(v.array(v.string())),
    supportedLanguages: v.array(v.string()),
    starterCode: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const question = await ctx.db.get(args.id)
    if (!question) throw new Error("Question not found")

    return await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      examples: args.examples,
      constraints: args.constraints,
      supportedLanguages: args.supportedLanguages,
      starterCode: args.starterCode,
    })
  },
})

// Delete a question
export const deleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const question = await ctx.db.get(args.id)
    if (!question) throw new Error("Question not found")

    await ctx.db.delete(args.id)
    return { success: true }
  },
})
