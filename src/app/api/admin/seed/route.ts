import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const burkinaFasoReportQuestions = [
  {
    questionText: "Quel est l'intitulé officiel du rapport pays présenté par le Burkina Faso en juin 2024 ?",
    optionA: "Rapport national sur la transition énergétique et les mines",
    optionB: "Rapport pays de l'exercice 2023 de suivi du Partenariat mondial pour une coopération efficace au service du développement (PMCED)",
    optionC: "Bilan décennal sur les investissements directs étrangers",
    optionD: "Rapport d'audit de la Chambre des comptes de l'Union économique et monétaire",
    correctOption: "B",
    explanation: "Le rapport a été élaboré par la Direction générale de la coopération (DGCOOP) du Ministère de l'Économie et des Finances et porte sur le suivi de l'exercice 2023 du PMCED."
  },
  {
    questionText: "Combien de dimensions fondamentales sont évaluées dans le cadre de suivi standard de Busan (PMCED) ?",
    optionA: "Deux (2) dimensions",
    optionB: "Trois (3) dimensions",
    optionC: "Quatre (4) dimensions",
    optionD: "Six (6) dimensions",
    correctOption: "C",
    explanation: "Le questionnaire standard évalue quatre dimensions : « Ensemble de la société », « État et utilisation des systèmes nationaux », « Transparence » et « Ne laisser personne de côté »."
  },
  {
    questionText: "Lors de l'exercice 2023 de suivi du PMCED au Burkina Faso, combien de Partenaires du développement ont renseigné les questionnaires sur les 43 intéressés ?",
    optionA: "15 partenaires (34,8%)",
    optionB: "27 partenaires (62,8%)",
    optionC: "38 partenaires (88,3%)",
    optionD: "Tous les 43 partenaires (100%)",
    correctOption: "B",
    explanation: "Selon la Figure 1 du rapport (page 17), 27 partenaires sur 43 ayant identifié des points focaux ont effectivement répondu, soit un taux de réponse de 62,8%."
  },
  {
    questionText: "Quel score élevé (sur une échelle de 0 à 1) le Burkina Faso a-t-il obtenu pour la composante « Planification » en 2023 ?",
    optionA: "0,52",
    optionB: "0,73",
    optionC: "0,95",
    optionD: "0,32",
    correctOption: "C",
    explanation: "La composante « Planification » (mesurant la qualité des stratégies nationales de développement et des cadres de résultats) a atteint un score très élevé de 0,95 en 2023, contre 0,93 en 2018."
  },
  {
    questionText: "Dans la dimension « État et utilisation des systèmes nationaux », quelle composante a enregistré le score le plus faible (0,32 en 2023 contre 0,56 en 2018) ?",
    optionA: "Gestion des finances publiques (GFP)",
    optionB: "Budgétisation sensible au genre",
    optionC: "Mécanismes de redevabilité",
    optionD: "Passation des marchés",
    correctOption: "A",
    explanation: "La Gestion des finances publiques a connu une baisse significative à 0,32, expliquée par le faible recours des partenaires aux procédures nationales de transmission de fonds et l'absence d'une évaluation PEFA récente."
  },
  {
    questionText: "Pour l'indicateur « Budgétisation sensible au genre », quelle note le Burkina Faso a-t-il obtenue en 2023 ?",
    optionA: "Note 0",
    optionB: "Note 0,5",
    optionC: "Note 0,8",
    optionD: "Note 1 (Score parfait)",
    correctOption: "D",
    explanation: "Le Burkina Faso a obtenu la note maximale de 1 (comme en 2018). Le pays dispose d'un système de suivi et de publication des ressources allouées au genre (105,02 milliards FCFA en 2022, soit 5,04% du budget)."
  },
  {
    questionText: "Dans la dimension « Transparence », quel est le score de l'action du gouvernement pour la mise à disposition publique des informations sur la Coopération ?",
    optionA: "Score de 0,40",
    optionB: "Score de 0,60",
    optionC: "Score de 0,85",
    optionD: "Score de 1,00",
    correctOption: "D",
    explanation: "L'indicateur mesurant la mise à la disposition du public des informations sur la Coopération pour le développement par le Gouvernement affiche un score parfait de 1."
  },
  {
    questionText: "Comment se nomme la plateforme en ligne mise en place par le Burkina Faso pour transmettre et suivre les données sur l'aide et les projets des partenaires ?",
    optionA: "PGA (Plateforme de Gestion de l'Aide)",
    optionB: "SIGAS (Système d'Information et de Gestion de l'Aide au Sahel)",
    optionC: "PEFA-Burkina",
    optionD: "Portail ODD 2030",
    correctOption: "A",
    explanation: "Le Burkina Faso a mis en place la Plateforme de Gestion de l'Aide (PGA) qui permet aux partenaires de transmettre directement en ligne leurs données d'aide et d'exécution des dépenses."
  },
  {
    questionText: "Quelle structure ou groupe de parties prenantes fait l'objet de l'Évaluation des Principes de Kampala (EPK) ?",
    optionA: "Les banques centrales de la sous-région",
    optionB: "Le Secteur Privé (ESP - Engagement du Secteur Privé)",
    optionC: "Les représentations diplomatiques uniquement",
    optionD: "Les agences de notation internationales",
    correctOption: "B",
    explanation: "L'EPK est un outil novateur conçu pour évaluer l'Engagement du secteur privé (ESP) dans le cadre de la Coopération pour le développement auprès de l'ensemble des parties prenantes."
  },
  {
    questionText: "Dans la dimension « Ensemble de la société », quel score le sous-indicateur « Contrôle parlementaire » a-t-il obtenu en 2023 ?",
    optionA: "0,45",
    optionB: "0,62",
    optionC: "0,81",
    optionD: "0,98",
    correctOption: "C",
    explanation: "Le contrôle parlementaire a obtenu un score élevé de 0,81 grâce à la transmission régulière d'informations au Parlement et à la ratification systématique des accords de financement."
  },
  {
    questionText: "Lequel de ces projets est explicitement cité dans le rapport comme facilitant l'accès des MPME à la technologie et aux compétences ?",
    optionA: "Le projet ECOTEC",
    optionB: "Le programme APD-Plus",
    optionC: "Le fonds Busan-Finance",
    optionD: "Le projet Horizon-2050",
    correctOption: "A",
    explanation: "Le Projet d'appui à l'Entreprenariat, au développement des compétences et à l'adoption technologique (ECOTEC) vise à améliorer l'accès des MPME à la technologie et à une main-d'œuvre qualifiée (page 60)."
  },
  {
    questionText: "Quelle direction générale du Ministère de l'Économie et des Finances assure la coordination nationale du suivi du PMCED au Burkina Faso ?",
    optionA: "La Direction Générale des Impôts (DGI)",
    optionB: "La Direction Générale de la Coopération (DGCOOP)",
    optionC: "La Direction Générale du Budget (DGB)",
    optionD: "La Direction Générale des Douanes (DGD)",
    correctOption: "B",
    explanation: "La DGCOOP (Direction générale de la coopération) assure la coordination nationale de l'exercice sous la supervision du Ministère de l'Économie et des Finances."
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
        quizTitle: "Burkina Faso - Évaluation PMCED 2023",
        quizDescription: "Testez vos connaissances sur le rapport pays de suivi du Partenariat mondial pour une coopération efficace au service du développement (PMCED - Burkina Faso 2023).",
        basePoints: 100,
        gracePeriodSeconds: 5,
        pointsPerSecond: 1,
        quizEnabled: true,
      },
      create: {
        id: "default-settings",
        quizTitle: "Burkina Faso - Évaluation PMCED 2023",
        quizDescription: "Testez vos connaissances sur le rapport pays de suivi du Partenariat mondial pour une coopération efficace au service du développement (PMCED - Burkina Faso 2023).",
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
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@QuizMaster2026!";
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

    // 3. Upsert Questions
    let count = 0;
    for (const q of burkinaFasoReportQuestions) {
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
      message: `Successfully seeded ${count} official questions from the Burkina Faso PMCED 2023 report.`,
      seededCount: count,
    });
  } catch (error) {
    console.error("Seeding API error:", error);
    return NextResponse.json({ error: "Failed to seed questions." }, { status: 500 });
  }
}
