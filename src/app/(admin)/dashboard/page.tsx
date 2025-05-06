"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import toast from "react-hot-toast"
import LoaderUI from "@/components/LoaderUI"
import { getCandidateInfo, groupInterviews } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { INTERVIEW_CATEGORY } from "@/constants"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarIcon, CheckCircle2Icon, ClockIcon, CodeIcon, PlusIcon, XCircleIcon, CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { InterviewComments } from "@/components/InterviewComments"
import PageTransition from "@/components/PageTransition"
import { useUserRole } from "@/hooks/useUserRole"
import { useRouter } from "next/navigation"

type Interview = Doc<"interviews">

function DashboardPage() {
  const router = useRouter();
  const { isInterviewer, isLoading } = useUserRole();
  const users = useQuery(api.users.getUsers)
  const interviews = useQuery(api.interviews.getAllInterviews)
  const updateStatus = useMutation(api.interviews.updateInterviewStatus)

  // Redirect if not an interviewer
  if (!isLoading && !isInterviewer) {
    router.push("/");
    return null;
  }

  const handleStatusUpdate = async (interviewId: Id<"interviews">, status: "scheduled" | "live" | "completed" | "succeeded" | "failed") => {
    try {
      await updateStatus({ id: interviewId, status })
      toast.success(`Interview marked as ${status}`)
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  if (isLoading || !interviews || !users) return <LoaderUI />

  const groupedInterviews = groupInterviews(interviews) as Record<string, Interview[]>
  const hasInterviews = Object.values(groupedInterviews).some(category => category.length > 0)

  return (
    <PageTransition>
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-3">
            <Link href="/dashboard/questions">
              <Button variant="outline">
                <CodeIcon className="h-4 w-4 mr-2" />
                Manage Questions
              </Button>
            </Link>
            <Link href="/schedule">
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
            </Link>
          </div>
        </div>

        {!hasInterviews ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">No Interviews Scheduled</h2>
                <p className="text-muted-foreground">
                  Get started by scheduling your first interview
                </p>
              </div>
              <Link href="/schedule">
                <Button className="mt-4">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {INTERVIEW_CATEGORY.map(
              (category) =>
                groupedInterviews[category.id]?.length > 0 && (
                  <section key={category.id}>
                    {/* CATEGORY TITLE */}
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-xl font-semibold">{category.title}</h2>
                      <Badge variant={category.variant}>{groupedInterviews[category.id].length}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedInterviews[category.id].map((interview: Interview) => {
                        const candidateInfo = getCandidateInfo(users, interview.candidateId)
                        const startTime = new Date(interview.startTime)

                        return (
                          <Card key={interview._id} className="hover:shadow-md transition-all">
                            {/* CANDIDATE INFO */}
                            <CardHeader className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={candidateInfo.image || "/placeholder.svg"} />
                                  <AvatarFallback>{candidateInfo.initials}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-base">{candidateInfo.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground">{interview.title}</p>
                                </div>
                              </div>
                            </CardHeader>

                            {/* DATE &  TIME */}
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  {format(startTime, "MMM dd")}
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="h-4 w-4" />
                                  {format(startTime, "hh:mm a")}
                                </div>
                              </div>
                            </CardContent>

                            {/* COMMENTS & VOTING */}
                            <div className="p-4 pt-0">
                              <InterviewComments interviewId={interview._id} status={interview.status} />
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </section>
                ),
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default DashboardPage
