import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const getVotes = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .filter((q) => q.eq(q.field("interviewId"), args.interviewId))
      .collect();

    // Get the interview to check number of interviewers
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    const totalVotes = votes.length;
    const passCount = votes.filter(vote => vote.vote === "pass").length;
    const passPercentage = totalVotes > 0 ? (passCount / totalVotes) * 100 : 0;
    
    // If there are 1-2 interviewers, 1 pass vote is enough
    // Otherwise, require majority (>50%)
    const hasPassed = interview.interviewerIds.length <= 2 
      ? passCount > 0 
      : passPercentage > 50;

    return {
      votes,
      totalVotes,
      passCount,
      passPercentage,
      hasPassed
    };
  },
});

export const addVote = mutation({
  args: {
    interviewId: v.id("interviews"),
    userId: v.string(),
    vote: v.union(v.literal("pass"), v.literal("fail")),
  },
  handler: async (ctx, args) => {
    // Get the interview first to check its status
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    console.log("Current interview status:", interview.status);
    console.log("Number of interviewers:", interview.interviewerIds.length);

    // Check if user has already voted
    const existingVote = await ctx.db
      .query("votes")
      .filter((q) => 
        q.and(
          q.eq(q.field("interviewId"), args.interviewId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (existingVote) {
      throw new Error("User has already voted");
    }

    // Insert the vote
    const voteId = await ctx.db.insert("votes", {
      interviewId: args.interviewId,
      userId: args.userId,
      vote: args.vote,
      createdAt: new Date().toISOString(),
    });

    // Get all votes after adding the new vote
    const votes = await ctx.db
      .query("votes")
      .filter((q) => q.eq(q.field("interviewId"), args.interviewId))
      .collect();

    const totalVotes = votes.length;
    const passCount = votes.filter(vote => vote.vote === "pass").length;
    const passPercentage = (passCount / totalVotes) * 100;

    console.log("Total votes:", totalVotes);
    console.log("Pass votes:", passCount);
    console.log("Pass percentage:", passPercentage);

    // Update interview status based on voting rules
    // If there are 1-2 interviewers, 1 pass vote is enough
    // Otherwise, require majority (>50%)
    const hasPassed = interview.interviewerIds.length <= 2 
      ? passCount > 0 
      : passPercentage > 50;

    console.log("Has passed:", hasPassed);
    const newStatus = hasPassed ? "succeeded" : "failed";
    console.log("New status:", newStatus);

    // Update the interview status using the updateInterviewStatus mutation
    try {
      await ctx.db.patch(args.interviewId, {
        status: newStatus
      });

      // Verify the update
      const updatedInterview = await ctx.db.get(args.interviewId);
      console.log("Updated interview:", updatedInterview);

      if (updatedInterview?.status !== newStatus) {
        throw new Error("Status update failed to persist");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }

    return voteId;
  },
}); 