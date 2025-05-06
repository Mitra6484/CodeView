import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    role: v.union(v.literal("candidate"), v.literal("interviewer")),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  interviews: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("completed"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_stream_call_id", ["streamCallId"]),

  comments: defineTable({
    interviewId: v.id("interviews"),
    userId: v.string(),
    content: v.string(),
    createdAt: v.string(),
    rating: v.optional(v.number()),
  }).index("by_interview", ["interviewId"]),

  votes: defineTable({
    interviewId: v.id("interviews"),
    userId: v.string(),
    vote: v.union(v.literal("pass"), v.literal("fail")),
    createdAt: v.string(),
  })
    .index("by_interview", ["interviewId"])
    .index("by_user", ["userId"]),

  questions: defineTable({
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
    createdBy: v.string(),
  }).index("by_created_by", ["createdBy"]),

  notifications: defineTable({
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("interview_scheduled"),
      v.literal("interview_result"),
      v.literal("interview_reminder"),
      v.literal("system")
    ),
    read: v.boolean(),
    link: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_user", ["userId", "createdAt"]),
})
