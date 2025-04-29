"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { toast } from "react-hot-toast"
import { LANGUAGES } from "@/constants"
import { z } from "zod"
import { useForm, ControllerRenderProps, FieldValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { PlusIcon, TrashIcon, XIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Question = Doc<"questions">

interface AddQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionToEdit?: Question
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  supportedLanguages: z.array(z.string()).min(1, "At least one language must be selected"),
  examples: z
    .array(
      z.object({
        input: z.string().min(1, "Input is required"),
        output: z.string().min(1, "Output is required"),
        explanation: z.string().optional(),
      }),
    )
    .min(1, "At least one example is required"),
  constraints: z.array(z.string()).optional(),
  starterCode: z.record(z.string()),
})

type FormValues = z.infer<typeof formSchema>

export default function AddQuestionDialog({ open, onOpenChange, questionToEdit }: AddQuestionDialogProps) {
  const [activeLanguage, setActiveLanguage] = useState<string>(LANGUAGES[0].id)

  const addQuestion = useMutation(api.questions.addQuestion)
  const updateQuestion = useMutation(api.questions.updateQuestion)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: questionToEdit
      ? {
          title: questionToEdit.title,
          description: questionToEdit.description,
          supportedLanguages: questionToEdit.supportedLanguages,
          examples: questionToEdit.examples,
          constraints: questionToEdit.constraints || [],
          starterCode: questionToEdit.starterCode,
        }
      : {
          title: "",
          description: "",
          supportedLanguages: [],
          examples: [{ input: "", output: "", explanation: "" }],
          constraints: [],
          starterCode: {},
        },
  })

  const { watch, setValue } = form
  const supportedLanguages = watch("supportedLanguages")
  const examples = watch("examples")
  const constraints = watch("constraints") || []

  const onSubmit = async (values: FormValues) => {
    try {
      if (questionToEdit) {
        await updateQuestion({
          id: questionToEdit._id,
          ...values,
        })
        toast.success("Question updated successfully")
      } else {
        await addQuestion(values)
        toast.success("Question added successfully")
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error(questionToEdit ? "Failed to update question" : "Failed to add question")
    }
  }

  const handleLanguageToggle = (language: string, checked: boolean) => {
    const updatedLanguages = checked
      ? [...supportedLanguages, language]
      : supportedLanguages.filter((lang) => lang !== language)

    setValue("supportedLanguages", updatedLanguages)

    // Initialize starter code for newly added languages
    if (checked) {
      const starterCode = { ...form.getValues("starterCode") }
      starterCode[language] = ""
      setValue("starterCode", starterCode)
    }
  }

  const addExample = () => {
    setValue("examples", [...examples, { input: "", output: "", explanation: "" }])
  }

  const removeExample = (index: number) => {
    setValue(
      "examples",
      examples.filter((_, i) => i !== index),
    )
  }

  const addConstraint = () => {
    setValue("constraints", [...constraints, ""])
  }

  const updateConstraint = (index: number, value: string) => {
    const updatedConstraints = [...constraints]
    updatedConstraints[index] = value
    setValue("constraints", updatedConstraints)
  }

  const removeConstraint = (index: number) => {
    setValue(
      "constraints",
      constraints.filter((_, i) => i !== index),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{questionToEdit ? "Edit Question" : "Add New Question"}</DialogTitle>
          <DialogDescription>
            {questionToEdit
              ? "Update the details of your coding question"
              : "Create a new coding question for interviews"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-hidden">
            <ScrollArea className="pr-4 h-[calc(90vh-180px)]">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Two Sum" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Supported Languages */}
                <div>
                  <FormLabel>Supported Languages</FormLabel>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {LANGUAGES.map((language) => (
                      <div key={language.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`language-${language.id}`}
                          checked={supportedLanguages.includes(language.id)}
                          onCheckedChange={(checked) => handleLanguageToggle(language.id, checked as boolean)}
                        />
                        <label
                          htmlFor={`language-${language.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                        >
                          <img
                            src={language.icon || "/placeholder.svg"}
                            alt={language.name}
                            className="w-4 h-4 object-contain"
                          />
                          {language.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.supportedLanguages && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.supportedLanguages.message}
                    </p>
                  )}
                </div>

                {/* Starter Code */}
                {supportedLanguages.length > 0 && (
                  <div>
                    <FormLabel>Starter Code</FormLabel>
                    <Tabs value={activeLanguage} onValueChange={setActiveLanguage} className="mt-2">
                      <TabsList className="mb-2">
                        {supportedLanguages.map((lang) => (
                          <TabsTrigger key={lang} value={lang} className="flex items-center gap-1">
                            <img src={`/${lang}.png`} alt={lang} className="w-4 h-4 object-contain" />
                            {LANGUAGES.find((l) => l.id === lang)?.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {supportedLanguages.map((lang) => (
                        <TabsContent key={lang} value={lang}>
                          <FormField
                            control={form.control}
                            name={`starterCode.${lang}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder={`function twoSum(nums, target) {\n  // Write your solution here\n  \n}`}
                                    className="font-mono min-h-[200px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}

                {/* Examples */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Examples</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addExample}>
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Example
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {examples.map((example, index) => (
                      <div key={index} className="border rounded-md p-4 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => removeExample(index)}
                          disabled={examples.length === 1}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={`examples.${index}.input`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Input</FormLabel>
                                <FormControl>
                                  <Input placeholder="nums = [2,7,11,15], target = 9" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`examples.${index}.output`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Output</FormLabel>
                                <FormControl>
                                  <Input placeholder="[0,1]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`examples.${index}.explanation`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Explanation (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Constraints (Optional)</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addConstraint}>
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Constraint
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {constraints.map((constraint, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={constraint}
                          onChange={(e) => updateConstraint(index, e.target.value)}
                          placeholder="2 ≤ nums.length ≤ 104"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 flex-shrink-0"
                          onClick={() => removeConstraint(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{questionToEdit ? "Update Question" : "Add Question"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
