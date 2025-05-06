import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Add a new comment
export const addComment = mutation({
  args: {
    interviewId: v.id("interviews"),
    content: v.string(),
    userId: v.string(),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      interviewId: args.interviewId,
      content: args.content,
      userId: args.userId,
      rating: args.rating,
      createdAt: new Date().toISOString(),
    });

    return commentId;
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the comment to verify ownership
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only allow deletion if the user is the comment owner
    if (comment.userId !== args.userId) {
      throw new Error("You can only delete your own comments");
    }

    // Delete the comment
    await ctx.db.delete(args.commentId);
  },
});

// Get comments for an interview
export const getComments = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();
  },
});

// Add or update a vote
export const addVote = mutation({
  args: {
    interviewId: v.id("interviews"),
    userId: v.string(),
    vote: v.union(v.literal("pass"), v.literal("fail")),
  },
  handler: async (ctx, args) => {
    // Check if user already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("interviewId"), args.interviewId))
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        vote: args.vote,
        createdAt: new Date().toISOString(),
      });
      return existingVote._id;
    } else {
      // Create new vote
      return await ctx.db.insert("votes", {
        interviewId: args.interviewId,
        userId: args.userId,
        vote: args.vote,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

// Get votes for an interview
export const getVotes = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();

    const passCount = votes.filter((v) => v.vote === "pass").length;
    const totalVotes = votes.length;
    const passPercentage = totalVotes > 0 ? (passCount / totalVotes) * 100 : 0;
    const hasPassed = passPercentage >= 50;

    return {
      votes,
      passCount,
      totalVotes,
      passPercentage,
      hasPassed,
    };
  },
});

// Get user's vote for an interview
export const getUserVote = query({
  args: {
    interviewId: v.id("interviews"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("interviewId"), args.interviewId))
      .first();
  },
});