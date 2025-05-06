import { useUser } from "@clerk/nextjs";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserInfo from "@/components/UserInfo";
import { Loader2Icon, XIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { TIME_SLOTS } from "@/constants";
import MeetingCard from "@/components/MeetingCard";
import { Id } from "../../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

function InterviewScheduleUI() {
  const client = useStreamVideoClient();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Id<"interviews"> | null>(null);
  const [isDeleting, setIsDeleting] = useState<Id<"interviews"> | null>(null);

  const interviews = useQuery(api.interviews.getAllInterviews) ?? [];
  const users = useQuery(api.users.getUsers) ?? [];
  const scheduleInterview = useMutation(api.interviews.scheduleInterview);
  const updateInterview = useMutation(api.interviews.updateInterview);
  const deleteInterview = useMutation(api.interviews.deleteInterview);

  const candidates = users?.filter((u) => u.role === "candidate");
  const interviewers = users?.filter((u) => u.role === "interviewer");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "09:00",
    candidateId: "",
    interviewerIds: user?.id ? [user.id] : [],
  });

  const handleEdit = (interview: any) => {
    if (interview.status !== "scheduled") {
      toast.error("Can only edit scheduled interviews");
      return;
    }
    setEditingInterview(interview._id);
    setFormData({
      title: interview.title,
      description: interview.description || "",
      date: new Date(interview.startTime),
      time: new Date(interview.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      candidateId: interview.candidateId,
      interviewerIds: interview.interviewerIds,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!client || !user) return;
    if (!formData.candidateId || formData.interviewerIds.length === 0) {
      toast.error("Please select both candidate and at least one interviewer");
      return;
    }
  
    setIsCreating(true);
    const { title, description, date, time, candidateId, interviewerIds } = formData;
    const [hours, minutes] = time.split(":");
    const meetingDate = new Date(date);
    meetingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
    // Check for time conflict (excluding the interview being edited)
    const conflict = interviews.some((interview) => {
      if (editingInterview && interview._id === editingInterview) return false;
      const interviewDate = new Date(interview.startTime);
      return (
        interviewDate.getFullYear() === meetingDate.getFullYear() &&
        interviewDate.getMonth() === meetingDate.getMonth() &&
        interviewDate.getDate() === meetingDate.getDate() &&
        interviewDate.getHours() === meetingDate.getHours() &&
        interviewDate.getMinutes() === meetingDate.getMinutes()
      );
    });
  
    if (conflict) {
      toast.error("Another interview is already scheduled at this time!");
      setIsCreating(false);
      return;
    }

    try {
      if (editingInterview) {
        await updateInterview({
          id: editingInterview,
          title,
          description,
          startTime: meetingDate.getTime(),
          candidateId,
          interviewerIds,
        });
        toast.success("Interview updated successfully!");
      } else {
        const id = crypto.randomUUID();
        const call = client.call("default", id);
  
        await call.getOrCreate({
          data: {
            starts_at: meetingDate.toISOString(),
            custom: {
              description: title,
              additionalDetails: description,
            },
          },
        });
  
        await scheduleInterview({
          title,
          description,
          startTime: meetingDate.getTime(),
          status: "scheduled",
          streamCallId: id,
          candidateId,
          interviewerIds,
        });
        toast.success("Interview scheduled successfully!");
      }
    } catch (error) {
      toast.error(editingInterview ? "Failed to update interview" : "Failed to schedule interview");
    } finally {
      setIsCreating(false);
      setOpen(false);
      setEditingInterview(null);
      setFormData({
        title: "",
        description: "",
        date: new Date(),
        time: "09:00",
        candidateId: "",
        interviewerIds: user?.id ? [user.id] : [],
      });
    }
  };

  const addInterviewer = (interviewerId: string) => {
    if (!formData.interviewerIds.includes(interviewerId)) {
      setFormData((prev) => ({
        ...prev,
        interviewerIds: [...prev.interviewerIds, interviewerId],
      }));
    }
  };

  const removeInterviewer = (interviewerId: string) => {
    if (interviewerId === user?.id) return;
    setFormData((prev) => ({
      ...prev,
      interviewerIds: prev.interviewerIds.filter((id) => id !== interviewerId),
    }));
  };

  const selectedInterviewers = interviewers.filter((i) =>
    formData.interviewerIds.includes(i.clerkId)
  );

  const availableInterviewers = interviewers.filter(
    (i) => !formData.interviewerIds.includes(i.clerkId)
  );

  const handleDelete = async (interviewId: Id<"interviews">) => {
    try {
      setIsDeleting(interviewId);
      await deleteInterview({ id: interviewId });
      toast.success("Interview deleted successfully");
    } catch (error) {
      toast.error("Failed to delete interview");
    } finally {
      setIsDeleting(null);
    }
  };

  // Filter interviews based on user role and participation
  const filteredInterviews = interviews.filter((interview) => {
    if (!user) return false;
    return interview.interviewerIds.includes(user.id);
  });

  return (
    <PageTransition>
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          {/* HEADER INFO */}
          <div>
            <h1 className="text-3xl font-bold">Interviews</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage interviews</p>
          </div>

          {/* DIALOG */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg">Schedule Interview</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] h-[calc(100vh-200px)] overflow-auto">
              <DialogHeader>
                <DialogTitle>{editingInterview ? "Edit Interview" : "Schedule Interview"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* INTERVIEW TITLE */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Interview title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* INTERVIEW DESC */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Interview description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* CANDIDATE */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Candidate</label>
                  <Select
                    value={formData.candidateId}
                    onValueChange={(candidateId) => setFormData({ ...formData, candidateId })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.clerkId} value={candidate.clerkId}>
                          <UserInfo user={candidate} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* INTERVIEWERS */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Interviewers</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedInterviewers.map((interviewer) => (
                      <div
                        key={interviewer.clerkId}
                        className="inline-flex items-center gap-2 bg-secondary px-2 py-1 rounded-md text-sm"
                      >
                        <UserInfo user={interviewer} />
                        {interviewer.clerkId !== user?.id && (
                          <button
                            onClick={() => removeInterviewer(interviewer.clerkId)}
                            className="hover:text-destructive transition-colors"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {availableInterviewers.length > 0 && (
                    <Select onValueChange={addInterviewer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add interviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterviewers.map((interviewer) => (
                          <SelectItem key={interviewer.clerkId} value={interviewer.clerkId}>
                            <UserInfo user={interviewer} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* DATE & TIME */}
                <div className="flex gap-4">
                  {/* CALENDAR */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>

                  {/* TIME */}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <Select
                      value={formData.time}
                      onValueChange={(time) => setFormData({ ...formData, time })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[180px]">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => {
                    setOpen(false);
                    setEditingInterview(null);
                    setFormData({
                      title: "",
                      description: "",
                      date: new Date(),
                      time: "09:00",
                      candidateId: "",
                      interviewerIds: user?.id ? [user.id] : [],
                    });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                        {editingInterview ? "Updating..." : "Scheduling..."}
                      </>
                    ) : (
                      editingInterview ? "Update Interview" : "Schedule Interview"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* LOADING STATE & MEETING CARDS */}
        <AnimatePresence mode="wait">
          {!filteredInterviews ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </motion.div>
          ) : filteredInterviews.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredInterviews.map((interview) => (
                    <motion.div
                      key={interview._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="relative group"
                    >
                      <MeetingCard interview={interview} />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out transform translate-y-1 group-hover:translate-y-0">
                        {interview.status === "scheduled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(interview)}
                          >
                            Edit
                          </Button>
                        )}
                        {interview.interviewerIds.includes(user?.id || "") && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/90"
                            onClick={() => handleDelete(interview._id)}
                            disabled={isDeleting === interview._id}
                          >
                            {isDeleting === interview._id ? (
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2Icon className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-muted-foreground"
            >
              No interviews scheduled!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
export default InterviewScheduleUI;