# QuizMaster Pro ⚡

A complete, production-ready, full-stack Quiz Application designed for **Vercel** with **Next.js (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and **Tailwind CSS**.

---

## 🌟 Key Features

### 🎮 Participant Quiz Experience
- **Zero Friction Onboarding**: Instant start with participant name — no mandatory account registration.
- **Server-Side Question Randomization**: Question order is uniquely randomized for every attempt and securely locked to the session in the database so page refreshes never reset or shuffle order.
- **Anti-Cheat & Strict Server Timing**: Correct answers and explanations are **never exposed to client browser code** before submission. Question start and answer timestamps are measured on the server to prevent JavaScript timing manipulation.
- **Dynamic Speed-Based Scoring**: Fast answers earn higher scores. Configurable base points, grace periods, and per-second decay.
- **Negative Marking Support**: Configurable penalty for incorrect answers with optional negative total floor protection (prevents score from dropping below 0).
- **Instant Celebratory / Warning Animations**:
  - **Correct Answers**: Emerald theme, confetti burst animation, celebratory icon, and score animation.
  - **Incorrect Answers**: Ruby theme, shake animation, clear highlight of the correct answer, points deducted, and educational explanation.
- **Prominent Live Timer**: Real-time elapsed time with visual state changes (green during grace period, amber when past grace, rose when prolonged).
- **Review Answers**: Post-completion question-by-question audit displaying selected answer, correct answer, points earned, duration, and full explanation.
- **Verifiable Dynamic Certificates**: Executive-grade, printable completion certificate with unique reference ID (`CERT-YYYY-XXXX-XXXX`), 1-click high-res vector PDF download (via `jsPDF`), and print dialog.
- **Global Leaderboard**: Live rankings ordered by highest score, with fastest completion time as the tie-breaker.

### 🛡️ Protected Admin Portal (`/admin`)
- **Secure Authentication**: Password hashing with `bcryptjs`, signed JWT sessions (`jose`), HTTP-only secure cookies, and Next.js middleware protection.
- **Analytics Dashboard**: Real-time KPIs (Total Questions, Active Questions, Total Attempts, Completed Rate, Average Score, Peak Score, Average Duration, and Score Distribution).
- **Question Management**:
  - Create, view, edit, and soft-delete/deactivate questions.
  - Real-time search and filter (All, Active, Inactive).
  - Validation ensures 4 non-empty options and exactly 1 correct key.
  - Live participant preview modal.
  - **Historical Snapshot Guarantee**: Answers store immutable snapshots of questions at submission time, so editing a question later never alters or corrupts historical quiz results.
- **Results Audit & Inspection**: Searchable, filterable, sortable, and paginated table of all participant attempts. Click "Inspect" to view question-by-question selections, timing, and point awards.
- **Admin Leaderboard**: Live monitoring of participant standings.
- **Settings & Live Scoring Simulator**:
  - Adjust Base Points, Grace Period, Deduction per Second, Minimum Points, Negative Marking, Penalty, and Total Floor.
  - Live interactive scoring simulator directly in the settings dashboard for instant verification before saving.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS + CSS Animations |
| **Database** | PostgreSQL |
| **ORM** | Prisma ORM 5.x |
| **Authentication** | JWT (`jose`) with HTTP-only Cookies + `bcryptjs` |
| **Animations** | Framer Motion & `canvas-confetti` |
| **Validation** | Zod |
| **PDF Export** | `jspdf` (Serverless-compatible, zero headless browser dependencies) |
| **Testing** | Vitest (100% passed unit and integration test suite) |
| **Deployment** | Vercel (Edge & Node.js Serverless runtime) |

---

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma              # PostgreSQL schema (Admin, Question, Attempt, Answer, Settings)
│   └── migrations/
│       └── 20260929000000_init/   # Initial SQL migration for production deployments
├── scripts/
│   └── seed.mjs                   # Database seed script (Default admin & 10 sample questions)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with navbar and footer
│   │   ├── page.tsx               # Landing page (name entry, instructions, rules)
│   │   ├── globals.css            # Custom animations (shake, pulse), print CSS
│   │   ├── quiz/[attemptId]/      # Live interactive quiz player
│   │   ├── results/[attemptId]/   # Post-quiz scorecard & certificate trigger
│   │   ├── review/[attemptId]/    # Detailed question-by-question review
│   │   ├── leaderboard/           # Public leaderboard page
│   │   ├── admin/
│   │   │   ├── layout.tsx         # Admin sidebar and shell
│   │   │   ├── page.tsx           # Admin dashboard analytics
│   │   │   ├── login/             # Admin authentication
│   │   │   ├── questions/         # Question CRUD and preview
│   │   │   ├── results/           # Results table and answer inspector
│   │   │   ├── leaderboard/       # Admin leaderboard view
│   │   │   └── settings/          # Scoring config and live simulator
│   │   └── api/                   # Route handlers (auth, quiz, admin, cert, leaderboard)
│   ├── components/
│   │   ├── Navbar.tsx             # Responsive global navigation
│   │   ├── ConfettiEffect.tsx     # Canvas confetti bursts & fireworks
│   │   └── CertificateModal.tsx   # Printable certificate with PDF download
│   ├── lib/
│   │   ├── prisma.ts              # Prisma singleton client
│   │   ├── auth.ts                # JWT authentication utilities
│   │   ├── scoring.ts             # Pure scoring, decay, penalty, & ranking logic
│   │   ├── utils.ts               # Date/time formatters, certificate ID generator
│   │   └── validations.ts         # Zod schemas for forms and API payloads
│   ├── middleware.ts              # Route protection for /admin and /api/admin
│   └── __tests__/
│       ├── scoring.test.ts        # Unit tests verifying exact prompt scoring cases
│       └── integration.test.ts    # DB, JWT, idempotency, and snapshot tests
├── .env.example                   # Environment configuration template
└── package.json
```

---

## 🧮 Scoring Algorithm Explained

Each question is evaluated using **server-side timestamps** (`currentQuestionStartedAt` recorded when question is presented, and `now` when answer is received):

$$\text{timeTaken} = \frac{\text{now} - \text{currentQuestionStartedAt}}{1000}$$

### 1. Correct Answer Scoring Formula
- **Grace Period**: If $\text{timeTaken} \le \text{gracePeriodSeconds}$, award full $\text{basePoints}$ (default: 100).
- **Time Deduction**: If $\text{timeTaken} > \text{gracePeriodSeconds}$, deduct $\text{pointsPerSecond}$ for every whole second beyond the grace period:
  $$\text{deduction} = \lfloor \text{timeTaken} - \text{gracePeriodSeconds} \rfloor \times \text{pointsPerSecond}$$
  $$\text{score} = \max(\text{minimumCorrectPoints}, \text{basePoints} - \text{deduction})$$
- If $\text{timeTaken} \ge \text{basePoints}$ (e.g. $\ge 100\text{s}$), the score reaches $\text{minimumCorrectPoints}$ (0).

#### Verification Table (Default Settings: Base = 100, Grace = 5s, Decay = 1 pt/s):
| Elapsed Time | Deduction | Points Awarded |
|---|---|---|
| **0.0s – 5.0s** | 0 pts | **100 pts** |
| **6.0s** | 1 pt | **99 pts** |
| **7.0s** | 2 pts | **98 pts** |
| **10.0s** | 5 pts | **95 pts** |
| **20.0s** | 15 pts | **85 pts** |
| **50.0s** | 45 pts | **55 pts** |
| **100.0s+** | 95+ pts | **0 pts** |

### 2. Negative Marking
- **If Disabled**: Wrong Answer = $0\text{ pts}$.
- **If Enabled**: Wrong Answer = $-\text{negativePoints}$ (e.g. $-10\text{ pts}$).
- **Allow Negative Total Score**:
  - `false` (Default): $\text{totalScore} = \max(0, \text{currentScore} + \text{pointsAwarded})$. The cumulative score never falls below 0.
  - `true`: Cumulative score can become negative.

### 3. Leaderboard Ranking & Tie-Breaking
Participants on the leaderboard are ranked using the following criteria:
1. **Primary**: Highest total score ($\text{totalScore} \downarrow$).
2. **Tie-Breaker**: Fastest completion time ($\text{totalTime} \uparrow$).
3. **Sub-Tie-Breaker**: Earliest completion timestamp ($\text{completedAt} \uparrow$).

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node 22)
- PostgreSQL database (local or cloud like Neon / Supabase)

### 2. Clone and Install Dependencies
```bash
git clone <repo-url>
cd Quiz
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update the variables in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/quizdb?schema=public"
AUTH_SECRET="your-super-long-and-secure-random-secret-key-at-least-32-chars"
ADMIN_EMAIL="admin@quizapp.com"
ADMIN_PASSWORD="Admin@QuizMaster2026!"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Apply Database Migrations
```bash
npm run prisma:push
# OR for tracked migrations:
npx prisma migrate deploy
```

### 5. Seed Initial Questions and Admin
```bash
npm run db:seed
```
This initializes:
- Default quiz settings
- Admin account: `admin@quizapp.com` / `Admin@QuizMaster2026!`
- 10 comprehensive knowledge and tech questions

### 6. Run Unit & Integration Tests
```bash
npm test
```

### 7. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deploying to Vercel

### Step 1: Create a PostgreSQL Database
You can use any managed PostgreSQL provider compatible with Vercel:
- **Neon** (Recommended, zero-config serverless postgres): [https://neon.tech](https://neon.tech)
- **Supabase**: [https://supabase.com](https://supabase.com)
- **Vercel Postgres**: Available in the Vercel Dashboard Marketplace.

Obtain the connection string (`postgresql://username:password@hostname/dbname?sslmode=require`).

### Step 2: Push Your Code to GitHub / GitLab
```bash
git add .
git commit -m "Production ready QuizMaster application"
git push origin main
```

### Step 3: Import Project in Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your repository.
3. In **Build and Output Settings**, keep defaults:
   - Framework Preset: `Next.js`
   - Build Command: `next build` (Prisma generate is automatically run via `postinstall` in `package.json`).
4. In **Environment Variables**, add:
   - `DATABASE_URL`: Your production PostgreSQL URL (e.g. from Neon or Supabase)
   - `AUTH_SECRET`: A secure 32+ character random string (e.g. generated via `openssl rand -hex 32`)
   - `ADMIN_EMAIL`: Your initial production admin email (e.g. `admin@yourdomain.com`)
   - `ADMIN_PASSWORD`: A strong production password
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production domain (e.g. `https://quiz-master.vercel.app`)

### Step 4: Run Migrations and Seed on Production Database
From your terminal, run the deploy and seed commands pointing to your production database URL:
```bash
DATABASE_URL="your-production-database-url" npx prisma migrate deploy
DATABASE_URL="your-production-database-url" npm run db:seed
```

### Step 5: Access the Deployed Application
- Participant Quiz: `https://your-app.vercel.app/`
- Leaderboard: `https://your-app.vercel.app/leaderboard`
- Admin Login: `https://your-app.vercel.app/admin/login`

---

## 🔒 Security & Integrity Architecture

- **Server-Side Scoring Verification**: The client never calculates or determines its own score. The server computes time taken and points awarded based on stored question start times.
- **Hidden Answer Keys**: Route `/api/quiz/[attemptId]/state` strips `correctOption` and `explanation` before payload delivery. Users inspect-element cannot see the answers.
- **Idempotent Answer Submissions**: Prevents rapid double clicks or repeated HTTP requests from awarding duplicate points.
- **Question Snapshot Immutability**: Each answer stores a JSON snapshot of the question at submission time. Future edits by admins will not modify past quiz review screens or certificates.
- **HTTP-Only Cookies & Middleware Protection**: Admin JWTs are signed with HS256, stored in secure HTTP-only cookies, and checked by Next.js middleware before any `/admin/*` route or `/api/admin/*` API is reached.

---

## 📄 License
MIT License. Built for high-performance interactive assessments on Vercel.
