const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

// Helper function to format question with keywords
function formatQuestion(question) {
  return {
    id: question.id,
    question: question.question,
    answer: question.answer,
    keywords: question.keywords ? question.keywords.map(k => k.name) : []
  };
}

// GET /questions - List all questions with optional keyword search
router.get("/", async (req, res) => {
  try {
    const { keyword } = req.query;

    let where = {};
    
    if (keyword) {
      where = {
        keywords: {
          some: {
            name: keyword.toLowerCase()
          }
        }
      };
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        keywords: true
      },
      orderBy: { id: "asc" }
    });

    res.json(questions.map(formatQuestion));
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

// GET /questions/:questionId - Get single question with keywords
router.get("/:questionId", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        keywords: true
      }
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json(formatQuestion(question));
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ message: "Failed to fetch question" });
  }
});

// POST /questions - Create new question with keywords
router.post("/", async (req, res) => {
  try {
    const { question, answer, keywords } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ msg: "Question and answer are required" });
    }

    const newQuestion = await prisma.question.create({
      data: {
        question,
        answer,
        keywords: keywords ? {
          connectOrCreate: keywords.map((kw) => ({
            where: { name: kw.toLowerCase() },
            create: { name: kw.toLowerCase() }
          }))
        } : undefined
      },
      include: {
        keywords: true
      }
    });

    res.status(201).json(formatQuestion(newQuestion));
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: "Failed to create question" });
  }
});

// PUT /questions/:questionId - Update question with keywords
router.put("/:questionId", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const { question: newQuestion, answer, keywords } = req.body;

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!existingQuestion) {
      return res.status(404).json({ msg: "Question not found" });
    }

    if (!newQuestion || !answer) {
      return res.status(400).json({ msg: "Question and answer are required" });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        question: newQuestion,
        answer,
        keywords: keywords ? {
          set: [], // Disconnect all existing
          connectOrCreate: keywords.map((kw) => ({
            where: { name: kw.toLowerCase() },
            create: { name: kw.toLowerCase() }
          }))
        } : undefined
      },
      include: {
        keywords: true
      }
    });

    res.json(formatQuestion(updatedQuestion));
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: "Failed to update question" });
  }
});

// DELETE /questions/:questionId - Delete question
router.delete("/:questionId", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: { keywords: true }
    });

    if (!existingQuestion) {
      return res.status(404).json({ msg: "Question not found" });
    }

    await prisma.question.delete({
      where: { id: questionId }
    });

    res.json({
      msg: "Question deleted successfully",
      question: formatQuestion(existingQuestion)
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Failed to delete question" });
  }
});

// GET /questions/keywords/all - Get all unique keywords
router.get("/keywords/all", async (req, res) => {
  try {
    const keywords = await prisma.keyword.findMany({
      orderBy: { name: "asc" }
    });
    
    res.json(keywords.map(k => k.name));
  } catch (error) {
    console.error("Error fetching keywords:", error);
    res.status(500).json({ message: "Failed to fetch keywords" });
  }
});

module.exports = router;