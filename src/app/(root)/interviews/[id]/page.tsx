"use client"

import { InterviewComments } from "@/components/InterviewComments";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";

export default function InterviewPage({ params }: { params: { id: string } }) {
  const interview = useQuery(api.interviews.getInterview, { id: params.id as Id<"interviews"> });

  if (!interview) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading interview details...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="bg-card rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">{interview.title}</h1>
        <div className="space-y-2 text-muted-foreground">
          <p>Status: {interview.status}</p>
          <p>Start Time: {new Date(interview.startTime).toLocaleString()}</p>
          {interview.endTime && (
            <p>End Time: {new Date(interview.endTime).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <InterviewComments interviewId={interview._id} status={interview.status} />
      </div>
    </div>
  );
} 