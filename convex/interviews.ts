import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const interviews = await ctx.db.query("interviews").collect();
    return interviews;
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all interviews
    const allInterviews = await ctx.db.query("interviews").collect();

    // Filter interviews where user is either a candidate or interviewer
    const myInterviews = allInterviews.filter(
      (interview) =>
        interview.candidateId === identity.subject ||
        interview.interviewerIds.some(id => id === identity.subject)
    );

    return myInterviews;
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

// Add notification creation helper
async function createInterviewNotification(
  ctx: any,
  userId: string,
  title: string,
  message: string,
  type: "interview_scheduled" | "interview_result" | "interview_reminder" | "system",
  link?: string
) {
  await ctx.runMutation(api.notifications.createNotification, {
    userId,
    title,
    message,
    type,
    link,
  })
}

// Update the scheduleInterview mutation
export const scheduleInterview = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviewId = await ctx.db.insert("interviews", {
      ...args,
    });

    // Get candidate info
    const candidate = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.candidateId))
      .first();

    if (!candidate) throw new Error("Candidate not found");

    // Create notification for candidate
    await createInterviewNotification(
      ctx,
      args.candidateId,
      "Interview Scheduled",
      `Your interview for ${args.title} has been scheduled for ${new Date(args.startTime).toLocaleString()}`,
      "interview_scheduled",
      `/interviews/${interviewId}`
    )

    // Create notifications for interviewers
    for (const interviewerId of args.interviewerIds) {
      await createInterviewNotification(
        ctx,
        interviewerId,
        "New Interview Assignment",
        `You have been assigned to interview ${candidate.name} for ${args.title}`,
        "interview_scheduled",
        `/dashboard`
      )
    }

    return interviewId;
  },
});

// Update the updateInterviewStatus mutation
export const updateInterviewStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("completed"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.id);
    if (!interview) {
      throw new Error("Interview not found");
    }

    // Verify the user is an interviewer for this interview
    const isInterviewer = interview.interviewerIds.includes(identity.subject);
    if (!isInterviewer) {
      throw new Error("Only interviewers can update interview status");
    }

    // Update the status
    await ctx.db.patch(args.id, {
      status: args.status,
      endTime: args.status === "completed" ? Date.now() : undefined,
    });

    // Create notification for candidate about interview result
    if (args.status === "succeeded" || args.status === "failed") {
      // Get candidate info
      const candidate = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", interview.candidateId))
        .first();

      if (!candidate) throw new Error("Candidate not found");

      // Get votes for this interview
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_interview", (q) => q.eq("interviewId", args.id))
        .collect();

      const passCount = votes.filter(vote => vote.vote === "pass").length;
      const totalVotes = votes.length;
      const passPercentage = totalVotes > 0 ? (passCount / totalVotes) * 100 : 0;

      console.log("Creating notification for candidate:", {
        candidateId: candidate._id,
        status: args.status,
        title: args.status === "succeeded" ? "Congratulations! You Passed" : "Interview Result"
      });

      // Create detailed result notification for candidate
      const candidateNotification = await ctx.runMutation(api.notifications.createNotification, {
        userId: candidate._id,
        title: args.status === "succeeded" ? "Congratulations! You Passed" : "Interview Result",
        message: args.status === "succeeded"
          ? `Great news! You passed your interview for ${interview.title}. You received ${passCount} pass votes out of ${totalVotes} total votes (${passPercentage.toFixed(0)}% pass rate).`
          : `Your interview for ${interview.title} has been marked as failed. You received ${passCount} pass votes out of ${totalVotes} total votes (${passPercentage.toFixed(0)}% pass rate).`,
        type: "interview_result",
        link: `/interviews/${args.id}`
      });

      console.log("Created candidate notification:", candidateNotification);

      // Notify interviewers about the final result
      for (const interviewerId of interview.interviewerIds) {
        if (interviewerId !== identity.subject) { // Don't notify the interviewer who triggered this
          const interviewer = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", interviewerId))
            .first();

          if (interviewer) {
            await ctx.runMutation(api.notifications.createNotification, {
              userId: interviewer._id,
              title: args.status === "succeeded" ? "Candidate Passed Interview" : "Candidate Failed Interview",
              message: `${candidate.name || "The candidate"} has ${args.status === "succeeded" ? "passed" : "failed"} the interview for ${interview.title}. Final vote count: ${passCount} pass, ${totalVotes - passCount} fail.`,
              type: "interview_result",
              link: `/dashboard`
            });
          }
        }
      }
    }

    return await ctx.db.get(args.id);
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

    // Delete all votes associated with this interview
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.id))
      .collect();

    // Delete each vote
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete all comments associated with this interview
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.id))
      .collect();

    // Delete each comment
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
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

      // Only allow editing if the user is an interviewer and interview is scheduled
      const isInterviewer = interview.interviewerIds.includes(identity.subject);
      if (!isInterviewer) {
        throw new Error("Only interviewers can edit interviews");
      }
      if (interview.status !== "scheduled") {
        throw new Error("Only scheduled interviews can be edited");
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

// Add a reminder notification mutation
export const sendInterviewReminder = mutation({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId)
    if (!interview) {
      throw new Error("Interview not found")
    }

    const startTime = new Date(interview.startTime)
    const now = new Date()
    const timeUntilInterview = startTime.getTime() - now.getTime()

    // Only send reminder if interview is within next 24 hours
    if (timeUntilInterview > 0 && timeUntilInterview <= 24 * 60 * 60 * 1000) {
      // Send reminder to candidate
      await createInterviewNotification(
        ctx,
        interview.candidateId,
        "Interview Reminder",
        `Your interview for ${interview.title} is scheduled for ${startTime.toLocaleString()}`,
        "interview_reminder",
        `/interviews/${args.interviewId}`
      )

      // Send reminder to interviewers
      for (const interviewerId of interview.interviewerIds) {
        await createInterviewNotification(
          ctx,
          interviewerId,
          "Interview Reminder",
          `You have an interview with ${interview.candidateId} for ${interview.title} scheduled for ${startTime.toLocaleString()}`,
          "interview_reminder",
          `/dashboard`
        )
      }
    }
  },
})

export const getInterview = query({
  args: { id: v.id("interviews") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});