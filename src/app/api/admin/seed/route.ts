import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const audiologyQuestions = [
  {
    questionText: "What is the main mechanical property of the basilar membrane that gradually changes from the base toward the apex of the cochlea and contributes to frequency tuning?",
    optionA: "Stiffness",
    optionB: "Blood supply",
    optionC: "Endolymph volume",
    optionD: "Middle-ear pressure",
    correctOption: "A",
    explanation: "The stiffness gradient of the basilar membrane—progressively decreasing from the stiff base to the flexible apex—is the primary mechanical property governing passive frequency tuning in the cochlea."
  },
  {
    questionText: "A low-frequency sound produces its maximum basilar-membrane displacement closer to the apex than a high-frequency sound. Which principle does this demonstrate?",
    optionA: "Tonotopic organization",
    optionB: "Temporal masking",
    optionC: "Binaural summation",
    optionD: "Middle-ear resonance",
    correctOption: "A",
    explanation: "Tonotopic organization is the spatial mapping of frequency along the cochlea: high frequencies peak at the narrow, stiff basal region, whereas low frequencies peak at the compliant apical region."
  },
  {
    questionText: "The basal portion of the basilar membrane is generally stiffer and responds preferentially to higher frequencies than the more flexible apical portion. True or False?",
    optionA: "True",
    optionB: "False",
    optionC: "True only in diseased cochleae",
    optionD: "False, the apex is stiffer than the base",
    correctOption: "A",
    explanation: "True. The basilar membrane is narrowest and stiffest near the oval window (base), making it resonant at high frequencies, and widest and most flexible at the helicotrema (apex), where low frequencies peak."
  },
  {
    questionText: "If the cochlea behaved as a completely linear system, which response would be expected when the intensity of a tone is increased?",
    optionA: "The basilar-membrane response would increase proportionally",
    optionB: "The response would stop increasing above a certain level",
    optionC: "The response would decrease as intensity increases",
    optionD: "The response would become independent of frequency",
    correctOption: "A",
    explanation: "In a purely linear system, the output grows in direct 1:1 proportion to input changes across all stimulus intensities without compression or saturation."
  },
  {
    questionText: "What does the term 'compressive nonlinearity' of the cochlea mainly describe?",
    optionA: "A smaller increase in response for a given increase in sound level at higher levels",
    optionB: "A complete absence of basilar-membrane movement at high levels",
    optionC: "An increase in response that is greater than the increase in sound level",
    optionD: "Movement of the basilar membrane only toward the apex",
    correctOption: "A",
    explanation: "Compressive nonlinearity refers to the reduction of basilar-membrane gain at mid-to-high sound levels, effectively compressing an acoustic dynamic range of >120 dB into a manageable displacement range."
  },
  {
    questionText: "Which combination of factors contributes directly to the mechanical response of the basilar membrane to sound?",
    optionA: "Basilar membrane properties, cochlear fluid motion, and outer hair cell activity",
    optionB: "Pinna shape and ear canal acoustics alone",
    optionC: "Middle-ear muscle contractions and vestibular fluid pressure only",
    optionD: "Purely passive bone conduction without outer hair cell involvement",
    correctOption: "A",
    explanation: "The basilar membrane's mechanical response is governed by its intrinsic physical properties (stiffness/mass gradient), hydrodynamics of the cochlear fluids (traveling wave), and active electromotility of the outer hair cells (cochlear amplifier)."
  },
  {
    questionText: "Why is the traveling wave important for understanding basilar-membrane mechanics?",
    optionA: "It allows different frequencies to produce maximum displacement at different cochlear locations",
    optionB: "It causes all frequencies to peak at exactly the same location",
    optionC: "It prevents the basilar membrane from moving",
    optionD: "It converts acoustic energy directly into neural impulses",
    correctOption: "A",
    explanation: "The traveling wave propagates from base to apex, slowing down and peaking in amplitude at the specific tonotopic place corresponding to the sound's frequency before rapidly decaying."
  },
  {
    questionText: "Outer hair cells contribute to the active mechanical process of the cochlea and therefore play a role in cochlear amplification and compression. True or False?",
    optionA: "True",
    optionB: "False",
    optionC: "True only in post-mortem cochleae",
    optionD: "False, outer hair cells only provide sensory transduction to the brain",
    correctOption: "A",
    explanation: "True. Through prestin-mediated somatic electromotility, outer hair cells feed mechanical energy back into the organ of Corti, delivering 40-50 dB of amplification, sharp frequency tuning, and compressive nonlinearity."
  },
  {
    questionText: "A tone is presented at a higher intensity, and the basilar-membrane response increases but not in direct proportion to the increase in stimulus level. Which feature of cochlear mechanics does this best demonstrate?",
    optionA: "Nonlinear compression",
    optionB: "Tonotopic mapping",
    optionC: "Binaural interaction",
    optionD: "Temporal integration",
    correctOption: "A",
    explanation: "A sub-proportional growth of mechanical vibration with increasing stimulus level is the direct physical manifestation of active cochlear nonlinear compression."
  },
  {
    questionText: "Which of the following statements correctly summarizes the physical characteristics of the basilar membrane?",
    optionA: "It is relatively wider and more flexible toward the apex, stiffer at the base, and this gradient drives frequency selectivity",
    optionB: "It has identical uniform stiffness throughout its entire length",
    optionC: "It is stiffest at the apex and floppiest at the base",
    optionD: "It responds uniformly to all audible sound frequencies at every cochlear partition",
    correctOption: "A",
    explanation: "The basilar membrane is narrow and stiff at the cochlear base, widening and becoming significantly more compliant toward the apex, creating the physical impedance gradient required for place-frequency analysis."
  }
];

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const isAuthorized = admin || (key && key === (process.env.AUTH_SECRET || "fallback-secret-minimum-32-characters-very-secure!"));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Ensure Quiz Settings
    await prisma.quizSettings.upsert({
      where: { id: "default-settings" },
      update: {
        quizTitle: "Basilar Membrane Mechanics & Nonlinearity",
        quizDescription: "Medium-Level Quiz – MSc Audiology. Test your understanding of cochlear mechanics, tonotopic organization, traveling waves, and compressive nonlinearity.",
        basePoints: 100,
        gracePeriodSeconds: 5,
        pointsPerSecond: 1,
        quizEnabled: true,
      },
      create: {
        id: "default-settings",
        quizTitle: "Basilar Membrane Mechanics & Nonlinearity",
        quizDescription: "Medium-Level Quiz – MSc Audiology. Test your understanding of cochlear mechanics, tonotopic organization, traveling waves, and compressive nonlinearity.",
        basePoints: 100,
        gracePeriodSeconds: 5,
        pointsPerSecond: 1,
        minimumCorrectPoints: 0,
        negativeMarkingEnabled: false,
        negativePoints: 10,
        allowNegativeTotal: false,
        quizEnabled: true,
      },
    });

    // 2. Ensure Admin User
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@quizapp.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@!";
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: {
        email: adminEmail,
        name: "Platform Administrator",
        passwordHash,
      },
    });

    // 3. Deactivate non-matching and upsert questions
    const targetTexts = audiologyQuestions.map((q) => q.questionText);
    await prisma.question.updateMany({
      where: { questionText: { notIn: targetTexts } },
      data: { isActive: false },
    });

    let count = 0;
    for (const q of audiologyQuestions) {
      const existing = await prisma.question.findFirst({
        where: { questionText: q.questionText },
      });

      if (existing) {
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            explanation: q.explanation,
            isActive: true,
          },
        });
      } else {
        await prisma.question.create({
          data: {
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            explanation: q.explanation,
            isActive: true,
          },
        });
      }
      count++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${count} MSc Audiology questions on Basilar Membrane Mechanics.`,
      seededCount: count,
    });
  } catch (error) {
    console.error("Seeding API error:", error);
    return NextResponse.json({ error: "Failed to seed questions." }, { status: 500 });
  }
}
