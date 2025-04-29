"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import LoaderUI from "@/components/LoaderUI"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import QuestionsList from "@/components/questions/QuestionsList"
import AddQuestionDialog from "@/components/questions/AddQuestionDialog"

export default function QuestionsPage() {
  const questions = useQuery(api.questions.getAllQuestions)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  if (questions === undefined) return <LoaderUI />

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Coding Questions</h1>
          <p className="text-muted-foreground">Manage your coding questions for interviews</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      <QuestionsList questions={questions} />

      <AddQuestionDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  )
}
