"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, MessageSquare, Star, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { getInterviewerInfo } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface InterviewCommentsProps {
  interviewId: Id<"interviews">;
  status: string;
  dateTimeControls?: JSX.Element;
}

export function InterviewComments({ interviewId, status, dateTimeControls }: InterviewCommentsProps) {
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState("3");

  const comments = useQuery(api.comments.getComments, { interviewId });
  const votes = useQuery(api.votes.getVotes, { interviewId });
  const userVote = votes?.votes.find(vote => vote.userId === user?.id);
  const users = useQuery(api.users.getUsers);

  const addComment = useMutation(api.comments.addComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const addVote = useMutation(api.votes.addVote);

  const handleAddComment = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to comment");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      await addComment({
        interviewId,
        content: newComment.trim(),
        userId: user.id,
        rating: parseInt(rating),
      });
      setNewComment("");
      setRating("3");
      setIsDialogOpen(false);
      toast.success("Comment added successfully");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: Id<"comments">) => {
    if (!user?.id) return;

    try {
      await deleteComment({
        commentId,
        userId: user.id,
      });
      toast.success("Comment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleVote = async (vote: "pass" | "fail") => {
    if (!user?.id) return;
    if (status !== "completed") {
      toast.error("You can only vote on completed interviews");
      return;
    }

    try {
      await addVote({
        interviewId,
        userId: user.id,
        vote,
      });
      toast.success("Vote recorded successfully");
    } catch (error) {
      toast.error("Failed to record vote");
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <Star
          key={starValue}
          className={`h-4 w-4 ${starValue <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );

  if (!user || !users) return null;

  return (
    <div className="space-y-4">
      {/* Voting Section - Only show for completed interviews */}
      {status === "completed" && (
        <div className="bg-card rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold">Vote on Candidate</h3>
          {!userVote ? (
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleVote("pass")}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Pass
              </Button>
              <Button
                variant="outline"
                onClick={() => handleVote("fail")}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Fail
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                You have voted: <span className="font-medium">{userVote.vote === "pass" ? "Pass" : "Fail"}</span>
              </p>
            </div>
          )}

          {/* Vote Results */}
          {votes && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pass: {votes.passCount}</span>
                <span>Total: {votes.totalVotes}</span>
              </div>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${votes.passPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {votes.hasPassed ? "Candidate has passed" : "Candidate has not passed"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      <div className="space-y-2">
        <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-6 hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-base font-medium">Comments</span>
                  <Badge variant="secondary" className="ml-1">
                    {comments?.length || 0}
                  </Badge>
                </div>
                {isCommentsOpen ? (
                  <ChevronUp className="ml-auto h-5 w-5" />
                ) : (
                  <ChevronDown className="ml-auto h-5 w-5" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1 ml-2 mr-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add Comment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <SelectItem key={value} value={value.toString()}>
                            <div className="flex items-center gap-2">
                              {renderStars(value)}
                              <span className="text-sm text-muted-foreground">
                                {value === 1 ? "Poor" : value === 5 ? "Excellent" : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Your Comment</Label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your detailed comment about the candidate..."
                      className="h-32"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddComment}>Submit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <CollapsibleContent>
            <div className="bg-card rounded-lg p-4 mt-2">
              {comments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-8 w-8" />
                  <p className="mt-2">No comments yet</p>
                  <p className="text-sm">Be the first to add a comment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {comments?.map((comment) => {
                      const interviewer = getInterviewerInfo(users, comment.userId);
                      const isOwnComment = comment.userId === user.id;
                      return (
                        <motion.div
                          key={comment._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="bg-secondary/50 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={interviewer.image} />
                                <AvatarFallback>{interviewer.initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{interviewer.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(comment.createdAt), "MMM d, yyyy • h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {comment.rating && renderStars(comment.rating)}
                              {isOwnComment && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteComment(comment._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}