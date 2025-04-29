"use client"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditIcon, TrashIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import AddQuestionDialog from "./AddQuestionDialog"

type Question = Doc<"questions">

interface QuestionsListProps {
  questions: Question[]
}

export default function QuestionsList({ questions }: QuestionsListProps) {
  const [questionToDelete, setQuestionToDelete] = useState<Id<"questions"> | null>(null)
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null)

  const deleteQuestion = useMutation(api.questions.deleteQuestion)

  const handleDelete = async () => {
    if (!questionToDelete) return

    try {
      await deleteQuestion({ id: questionToDelete })
      toast.success("Question deleted successfully")
    } catch (error) {
      toast.error("Failed to delete question")
    } finally {
      setQuestionToDelete(null)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No questions found. Add your first question!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {questions.map((question) => (
          <Card key={question._id} className="hover:shadow-md transition-all">
            <CardHeader className="p-4">
              <CardTitle className="text-lg">{question.title}</CardTitle>
              <CardDescription className="line-clamp-2">{question.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {question.supportedLanguages.map((lang) => (
                  <Badge key={lang} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {question.examples.length} example{question.examples.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuestionToEdit(question)}>
                <EditIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setQuestionToDelete(question._id)}>
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Question Dialog */}
      {questionToEdit && (
        <AddQuestionDialog
          open={!!questionToEdit}
          onOpenChange={(open) => !open && setQuestionToEdit(null)}
          questionToEdit={questionToEdit}
        />
      )}
    </>
  )
}
