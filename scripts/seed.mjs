import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const sampleQuestions = [
  {
    questionText: "Which data structure operates on a Last-In, First-Out (LIFO) principle?",
    optionA: "Queue",
    optionB: "Stack",
    optionC: "Binary Search Tree",
    optionD: "Linked List",
    correctOption: "B",
    explanation: "A Stack stores elements sequentially where the most recently added item is the first one removed (LIFO)."
  },
  {
    questionText: "In HTTP status codes, what does status code 429 indicate?",
    optionA: "Unauthorized",
    optionB: "Payload Too Large",
    optionC: "Too Many Requests",
    optionD: "Gateway Timeout",
    correctOption: "C",
    explanation: "HTTP 429 Too Many Requests response code indicates that the user has sent too many requests in a given amount of time (rate limiting)."
  },
  {
    questionText: "Which programming language was created by Brendan Eich in just 10 days in 1995?",
    optionA: "Python",
    optionB: "Java",
    optionC: "Ruby",
    optionD: "JavaScript",
    correctOption: "D",
    explanation: "Brendan Eich designed Mocha (later renamed LiveScript and finally JavaScript) in May 1995 while at Netscape Communications."
  },
  {
    questionText: "What is the average time complexity of searching an element in a balanced Binary Search Tree (AVL or Red-Black Tree)?",
    optionA: "O(1)",
    optionB: "O(log n)",
    optionC: "O(n)",
    optionD: "O(n log n)",
    correctOption: "B",
    explanation: "Because a balanced BST halves the search space at each level, lookup takes logarithmic time O(log n)."
  },
  {
    questionText: "Which protocol is primarily used for secure, encrypted communication across the World Wide Web?",
    optionA: "HTTPS (TLS)",
    optionB: "FTP",
    optionC: "Telnet",
    optionD: "SNMP",
    correctOption: "A",
    explanation: "HTTPS encrypts normal HTTP communication using Transport Layer Security (TLS) to prevent eavesdropping and tampering."
  },
  {
    questionText: "What does SQL stand for in database management?",
    optionA: "Standard Query Language",
    optionB: "Sequential Quick Language",
    optionC: "Structured Query Language",
    optionD: "Systematic Question Logic",
    correctOption: "C",
    explanation: "SQL stands for Structured Query Language, the standard domain-specific language used in relational database management."
  },
  {
    questionText: "Which planetary body has the strongest gravitational pull at its surface in our Solar System?",
    optionA: "Earth",
    optionB: "Jupiter",
    optionC: "Saturn",
    optionD: "Neptune",
    correctOption: "B",
    explanation: "Jupiter has the greatest surface gravity of any planet in our solar system at approximately 24.79 m/s², about 2.5 times Earth's gravity."
  },
  {
    questionText: "In modern web browsers, which Web API allows persistent key-value storage with no expiration date?",
    optionA: "sessionStorage",
    optionB: "HTTP Cookies",
    optionC: "localStorage",
    optionD: "Cache-Control",
    correctOption: "C",
    explanation: "localStorage persists data even after the browser window is closed, unlike sessionStorage which is cleared when the tab session ends."
  },
  {
    questionText: "What was the name of the first computer programmer in history, known for writing an algorithm for the Analytical Engine?",
    optionA: "Alan Turing",
    optionB: "Ada Lovelace",
    optionC: "Grace Hopper",
    optionD: "Charles Babbage",
    correctOption: "B",
    explanation: "Ada Lovelace published the first algorithm intended to be executed by Charles Babbage's mechanical general-purpose computer, the Analytical Engine."
  },
  {
    questionText: "In Git version control, which command combines changes from a specified branch into the currently checked-out branch?",
    optionA: "git commit",
    optionB: "git push",
    optionC: "git merge",
    optionD: "git clone",
    correctOption: "C",
    explanation: "'git merge' joins two or more development histories together into the active branch."
  }
];

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed or update Quiz Settings
  const settings = await prisma.quizSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      quizTitle: "NextGen Tech & General Knowledge Challenge",
      quizDescription: "Test your speed, intellect, and precision! Answer quickly for maximum points, avoid traps, and compete for the top spot on the global leaderboard.",
      basePoints: 100,
      gracePeriodSeconds: 5,
      pointsPerSecond: 1,
      minimumCorrectPoints: 0,
      negativeMarkingEnabled: false,
      negativePoints: 10,
      allowNegativeTotal: false,
      quizEnabled: true
    }
  });
  console.log(`✅ Quiz Settings initialized: "${settings.quizTitle}"`);

  // 2. Seed Admin User
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@quizapp.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@QuizMaster2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash
    },
    create: {
      email: adminEmail,
      name: "Platform Administrator",
      passwordHash: passwordHash
    }
  });
  console.log(`✅ Admin account created/updated: ${admin.email}`);

  // 3. Seed Questions if none exist
  const existingQuestionsCount = await prisma.question.count();
  if (existingQuestionsCount === 0) {
    console.log("Adding 10 initial questions...");
    for (const q of sampleQuestions) {
      await prisma.question.create({
        data: {
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation,
          isActive: true
        }
      });
    }
    console.log(`✅ Seeded ${sampleQuestions.length} initial questions.`);
  } else {
    console.log(`ℹ️ Database already has ${existingQuestionsCount} questions. Skipping question seeding.`);
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
