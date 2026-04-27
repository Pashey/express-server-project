const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

// Apply authentication to ALL routes in this router
router.use(authenticate);

// Helper function to format question
function formatQuestion(question) {
  return {
    id: question.id,
    question: question.question,
    answer: question.answer,
    keywords: question.keywords ? question.keywords.map(k => k.name) : [],
    createdBy: question.user ? {
      id: question.user.id,
      name: question.user.name,
      email: question.user.email
    } : null
  };
}

// GET /api/questions - List all questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const questions = await prisma.question.findMany({
    where,
    include: { keywords: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "asc" },
  });

  res.json(questions.map(formatQuestion));
});

// GET /api/questions/:questionId - Get single question
router.get("/:questionId", async (req, res) => {
  const questionId = parseInt(req.params.questionId);
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { keywords: true, user: { select: { id: true, name: true, email: true } } }
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(formatQuestion(question));
});

// POST /api/questions - Create new question
router.post("/", async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: "Question and answer are required" });
  }

  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
      userId: req.user.userId,  // From authenticate middleware
      keywords: keywords ? {
        connectOrCreate: keywords.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      } : undefined,
    },
    include: { keywords: true, user: { select: { id: true, name: true, email: true } } }
  });

  res.status(201).json(formatQuestion(newQuestion));
});

// PUT /api/questions/:questionId — isOwner checks existence + ownership
router.put("/:questionId", isOwner, async (req, res) => {
  const { question: newQuestion, answer, keywords } = req.body;

  if (!newQuestion || !answer) {
    return res.status(400).json({ msg: "Question and answer are required" });
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: req.question.id },
    data: {
      question: newQuestion,
      answer,
      keywords: keywords ? {
        set: [],
        connectOrCreate: keywords.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      } : undefined,
    },
    include: { keywords: true, user: { select: { id: true, name: true, email: true } } }
  });

  res.json(formatQuestion(updatedQuestion));
});

// DELETE /api/questions/:questionId — isOwner checks existence + ownership
router.delete("/:questionId", isOwner, async (req, res) => {
  await prisma.question.delete({
    where: { id: req.question.id },
  });

  res.json({ msg: "Question deleted successfully" });
});

// GET /api/questions/keywords/all - Get all keywords
router.get("/keywords/all", async (req, res) => {
  const keywords = await prisma.keyword.findMany({
    orderBy: { name: "asc" }
  });
  
  res.json(keywords.map(k => k.name));
});

module.exports = router;