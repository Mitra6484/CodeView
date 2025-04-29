"use client";

import ActionCard from "@/components/ActionCard";
import { QUICK_ACTIONS } from "@/constants";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import MeetingModal from "@/components/MeetingModal";
import LoaderUI from "@/components/LoaderUI";
import { Loader2Icon } from "lucide-react";
import MeetingCard from "@/components/MeetingCard";
import { CheckCircle2Icon, XCircleIcon, ChevronDownIcon, Trash2Icon } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Id } from "../../../../convex/_generated/dataModel";
import InterviewResultCard from "@/components/InterviewResultCard";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const router = useRouter();
  const [openResults, setOpenResults] = useState(false);
  const updateStatus = useMutation(api.interviews.updateInterviewStatus);

  const { isInterviewer, isCandidate, isLoading } = useUserRole();
  const interviews = useQuery(api.interviews.getMyInterviews);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"start" | "join">();

  const handleQuickAction = (title: string) => {
    switch (title) {
      case "New Call":
        setModalType("start");
        setShowModal(true);
        break;
      case "Join Interview":
        setModalType("join");
        setShowModal(true);
        break;
      default:
        router.push(`/${title.toLowerCase()}`);
    }
  };

  const handleDeleteResult = async (interviewId: Id<"interviews">) => {
    try {
      await updateStatus({ id: interviewId, status: "completed" });
      toast.success("Result cleared successfully");
    } catch (error) {
      toast.error("Failed to clear result");
    }
  };

  if (isLoading) return <LoaderUI />;

  return (
    <div className="container max-w-7xl mx-auto p-6">
      {/* WELCOME SECTION */}
      <div className="rounded-lg bg-card p-6 border shadow-sm mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Welcome back!
        </h1>
        <p className="text-muted-foreground mt-2">
          {isInterviewer
            ? "Manage your interviews and review candidates effectively"
            : "Access your upcoming interviews and preparations"}
        </p>
      </div>

      {isInterviewer ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUICK_ACTIONS.map((action) => (
              <ActionCard
                key={action.title}
                action={action}
                onClick={() => handleQuickAction(action.title)}
              />
            ))}
          </div>

          <MeetingModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={modalType === "join" ? "Join Meeting" : "Start Meeting"}
            isJoinMeeting={modalType === "join"}
          />
        </>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-bold">Your Interviews</h1>
            <p className="text-muted-foreground mt-1">View and join your scheduled interviews</p>
          </div>

          {/* Interview Results Section */}
          {interviews?.some((interview) => interview.status === "succeeded" || interview.status === "failed") && (
            <div className="mt-6">
              <Collapsible open={openResults} onOpenChange={setOpenResults}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
                    <h2 className="text-xl font-semibold">Interview Results</h2>
                    <Badge variant="secondary" className="ml-2">
                      {interviews.filter((interview) => interview.status === "succeeded" || interview.status === "failed").length}
                    </Badge>
                    <ChevronDownIcon 
                      className={`h-5 w-5 transition-transform duration-300 ${openResults ? "rotate-180" : ""}`} 
                    />
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-4 mt-4">
                  {interviews
                    .filter((interview) => interview.status === "succeeded" || interview.status === "failed")
                    .map((interview) => (
                      <InterviewResultCard
                        key={interview._id}
                        interview={interview}
                        onDelete={handleDeleteResult}
                      />
                    ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <div className="mt-8">
            {interviews === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : interviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {interviews.map((interview) => (
                  <MeetingCard key={interview._id} interview={interview} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                You have no scheduled interviews at the moment
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}