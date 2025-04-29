"use client"

import { CheckCircle2Icon, XCircleIcon, Trash2Icon } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Id } from "../../convex/_generated/dataModel"
import { toast } from "react-hot-toast"

interface InterviewResultCardProps {
  interview: {
    _id: Id<"interviews">
    title: string
    status: string
  }
  onDelete: (id: Id<"interviews">) => void
}

export default function InterviewResultCard({ interview, onDelete }: InterviewResultCardProps) {
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowBadge(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-all duration-300 ${
        interview.status === "succeeded"
          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900"
          : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {interview.status === "succeeded" ? (
            <CheckCircle2Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <h3 className="font-medium">
            {interview.status === "succeeded" ? "Congratulations!" : "Interview Result"}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(interview._id)}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {interview.status === "succeeded"
          ? `You have passed the interview for "${interview.title}"`
          : `The interview for "${interview.title}" has been marked as failed`}
      </p>

      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
            className="mt-2"
          >
            <Badge
              variant={interview.status === "succeeded" ? "default" : "destructive"}
              className="animate-pulse"
            >
              {interview.status === "succeeded" ? "🎉 Amazing Job!" : "Keep Trying!"}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 