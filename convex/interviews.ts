import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviews = await ctx.db.query("interviews").collect();

    return interviews;
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return interviews!;
  },
});

export const getInterviewByStreamCallId = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
  },
});

export const createInterview = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.insert("interviews", {
      ...args,
    });

    return interview;
  },
});

export const updateInterviewStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "completed" ? { endTime: Date.now() } : {}),
    });
  },
});

export const deleteInterview = mutation({
  args: {
    id: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get the interview to check permissions
    const interview = await ctx.db.get(args.id);
    if (!interview) throw new Error("Interview not found");

    // Only allow deletion if the user is an interviewer
    const isInterviewer = interview.interviewerIds.includes(identity.subject);
    
    if (!isInterviewer) {
      throw new Error("Only interviewers can delete interviews");
    }

    // Delete the interview
    await ctx.db.delete(args.id);
  },
});

export const updateInterview = mutation({
  args: {
    id: v.id("interviews"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Unauthorized");

      // Get the interview to check permissions
      const interview = await ctx.db.get(args.id);
      if (!interview) {
        console.error(`Interview not found with ID: ${args.id}`);
        throw new Error("Interview not found. It may have been deleted.");
      }

      // Only allow editing if the user is an interviewer and interview is upcoming
      const isInterviewer = interview.interviewerIds.includes(identity.subject);
      if (!isInterviewer) {
        throw new Error("Only interviewers can edit interviews");
      }
      if (interview.status !== "upcoming") {
        throw new Error("Only upcoming interviews can be edited");
      }

      return await ctx.db.patch(args.id, {
        title: args.title,
        description: args.description,
        startTime: args.startTime,
        candidateId: args.candidateId,
        interviewerIds: args.interviewerIds,
      });
    } catch (error: any) {
      console.error("Error updating interview:", error);
      throw error;
    }
  },
});