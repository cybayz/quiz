-- CreateEnum
CREATE TYPE "LiveQuizStatus" AS ENUM ('WAITING', 'QUESTION_READY', 'QUESTION_ACTIVE', 'LEADERBOARD', 'COMPLETED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT DEFAULT 'Administrator',
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "certificateId" TEXT,
    "questionOrder" TEXT NOT NULL,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionSnapshot" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "timeTaken" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_settings" (
    "id" TEXT NOT NULL DEFAULT 'default-settings',
    "quizTitle" TEXT NOT NULL DEFAULT 'NextGen Knowledge Challenge',
    "quizDescription" TEXT NOT NULL DEFAULT 'Test your knowledge and response speed in this interactive live quiz. Beat the clock, score high, and earn your certificate!',
    "basePoints" INTEGER NOT NULL DEFAULT 100,
    "gracePeriodSeconds" INTEGER NOT NULL DEFAULT 5,
    "pointsPerSecond" INTEGER NOT NULL DEFAULT 1,
    "minimumCorrectPoints" INTEGER NOT NULL DEFAULT 0,
    "negativeMarkingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "negativePoints" INTEGER NOT NULL DEFAULT 10,
    "allowNegativeTotal" BOOLEAN NOT NULL DEFAULT false,
    "quizEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_quiz_sessions" (
    "id" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "quizTitle" TEXT NOT NULL,
    "status" "LiveQuizStatus" NOT NULL DEFAULT 'WAITING',
    "questionOrder" TEXT NOT NULL,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "questionStartedAt" TIMESTAMP(3),
    "questionEndsAt" TIMESTAMP(3),
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "live_quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_quiz_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantToken" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "unansweredCount" INTEGER NOT NULL DEFAULT 0,
    "totalResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "certificateId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_quiz_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_quiz_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionSnapshot" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "cumulativeScore" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "questions_isActive_idx" ON "questions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_certificateId_key" ON "quiz_attempts"("certificateId");

-- CreateIndex
CREATE INDEX "quiz_attempts_status_totalScore_totalTime_idx" ON "quiz_attempts"("status", "totalScore", "totalTime");

-- CreateIndex
CREATE INDEX "quiz_answers_attemptId_idx" ON "quiz_answers"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "live_quiz_sessions_sessionCode_key" ON "live_quiz_sessions"("sessionCode");

-- CreateIndex
CREATE INDEX "live_quiz_sessions_status_idx" ON "live_quiz_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "live_quiz_participants_participantToken_key" ON "live_quiz_participants"("participantToken");

-- CreateIndex
CREATE UNIQUE INDEX "live_quiz_participants_certificateId_key" ON "live_quiz_participants"("certificateId");

-- CreateIndex
CREATE INDEX "live_quiz_participants_sessionId_totalScore_idx" ON "live_quiz_participants"("sessionId", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "live_quiz_participants_sessionId_participantName_key" ON "live_quiz_participants"("sessionId", "participantName");

-- CreateIndex
CREATE INDEX "live_quiz_answers_sessionId_questionIndex_idx" ON "live_quiz_answers"("sessionId", "questionIndex");

-- CreateIndex
CREATE INDEX "live_quiz_answers_participantId_idx" ON "live_quiz_answers"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "live_quiz_answers_sessionId_participantId_questionId_key" ON "live_quiz_answers"("sessionId", "participantId", "questionId");

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_quiz_participants" ADD CONSTRAINT "live_quiz_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_quiz_answers" ADD CONSTRAINT "live_quiz_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_quiz_answers" ADD CONSTRAINT "live_quiz_answers_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "live_quiz_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_quiz_answers" ADD CONSTRAINT "live_quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
