import { z } from "zod";

export const startQuizSchema = z.object({
  participantName: z
    .string()
    .trim()
    .min(2, { message: "Participant name must be at least 2 characters long." })
    .max(50, { message: "Participant name cannot exceed 50 characters." }),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, { message: "Question ID is required." }),
  selectedOption: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Selected option must be A, B, C, or D." }),
  }),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email({ message: "Please provide a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const questionFormSchema = z.object({
  questionText: z.string().trim().min(3, { message: "Question text is required." }),
  optionA: z.string().trim().min(1, { message: "Option A is required." }),
  optionB: z.string().trim().min(1, { message: "Option B is required." }),
  optionC: z.string().trim().min(1, { message: "Option C is required." }),
  optionD: z.string().trim().min(1, { message: "Option D is required." }),
  correctOption: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Correct answer must be Option A, B, C, or D." }),
  }),
  explanation: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const settingsSchema = z.object({
  quizTitle: z.string().trim().min(3, { message: "Quiz title must be at least 3 characters." }),
  quizDescription: z.string().trim().min(5, { message: "Quiz description must be at least 5 characters." }),
  basePoints: z.coerce.number().int().min(1, { message: "Base points must be at least 1." }),
  gracePeriodSeconds: z.coerce.number().int().min(0, { message: "Grace period must be 0 or more seconds." }),
  pointsPerSecond: z.coerce.number().int().min(0, { message: "Points deducted per second must be 0 or more." }),
  minimumCorrectPoints: z.coerce.number().int().min(0, { message: "Minimum points must be 0 or more." }),
  negativeMarkingEnabled: z.boolean(),
  negativePoints: z.coerce.number().int().min(0, { message: "Negative points must be 0 or more." }),
  allowNegativeTotal: z.boolean(),
  quizEnabled: z.boolean(),
});
