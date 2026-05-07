const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const upload = require("../middleware/upload");

// Helper function to parse keywords from both JSON and multipart/form-data
function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

// GET /api/questions - Get all questions with pagination
router.get("/", authenticate, async (req, res) => {
  try {
    const { keyword, page = 1, limit = 5 } = req.query;
    const userId = req.user.userId;
    
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageLimit = Math.max(1, Math.min(100, parseInt(limit) || 5));
    const skip = (currentPage - 1) * pageLimit;

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

    // Get questions with relations
    const questions = await prisma.question.findMany({
      where,
      include: { 
        keywords: true, 
        user: true,
        attempts: {
          where: { userId: userId },
          take: 1
        }
      },
      orderBy: { id: "asc" },
      skip: skip,
      take: pageLimit
    });

    const totalQuestions = await prisma.question.count({ where });

    // Get attempt counts for each question
    const attemptCounts = await Promise.all(
      questions.map(async (q) => {
        const totalAttempts = await prisma.attempt.count({
          where: { questionId: q.id }
        });
        const correctAttempts = await prisma.attempt.count({
          where: { 
            questionId: q.id,
            isCorrect: true
          }
        });
        return { id: q.id, totalAttempts, correctAttempts };
      })
    );

    // Format response
    const formattedQuestions = questions.map(q => {
      const attemptData = attemptCounts.find(ac => ac.id === q.id);
      const userAttempt = q.attempts && q.attempts.length > 0 ? q.attempts[0] : null;
      const solved = userAttempt && userAttempt.isCorrect;
      
      return {
        id: q.id,
        question: q.question,
        answer: q.answer,
        imageUrl: q.imageUrl || null,
        userId: q.userId,
        keywords: q.keywords ? q.keywords.map(k => k.name) : [],
        userName: q.user?.name || null,
        totalAttempts: attemptData?.totalAttempts || 0,
        correctAttempts: attemptData?.correctAttempts || 0,
        solved: solved,
        attempted: !!userAttempt,
        userAnswer: userAttempt?.userAnswer || null
      };
    });

    const totalPages = Math.ceil(totalQuestions / pageLimit);

    res.json({
      data: formattedQuestions,
      page: currentPage,
      limit: pageLimit,
      total: totalQuestions,
      totalPages: totalPages
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Failed to fetch questions", error: error.message });
  }
});

// GET /api/questions/:questionId - Get single question
router.get("/:questionId", authenticate, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const userId = req.user.userId;
    
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { 
        keywords: true, 
        user: true,
        attempts: {
          where: { userId: userId },
          take: 1
        }
      }
    });
    
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    const totalAttempts = await prisma.attempt.count({
      where: { questionId: question.id }
    });
    
    const correctAttempts = await prisma.attempt.count({
      where: { 
        questionId: question.id,
        isCorrect: true
      }
    });
    
    const userAttempt = question.attempts && question.attempts.length > 0 ? question.attempts[0] : null;
    const solved = userAttempt && userAttempt.isCorrect;
    
    res.json({
      id: question.id,
      question: question.question,
      answer: question.answer,
      imageUrl: question.imageUrl || null,
      userId: question.userId,
      keywords: question.keywords ? question.keywords.map(k => k.name) : [],
      userName: question.user?.name || null,
      totalAttempts: totalAttempts,
      correctAttempts: correctAttempts,
      solved: solved,
      attempted: !!userAttempt,
      userAnswer: userAttempt?.userAnswer || null
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ message: "Failed to fetch question" });
  }
});

// POST /api/questions/:questionId/play - Submit answer for a question
router.post("/:questionId/play", authenticate, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const userId = req.user.userId;
    const { userAnswer } = req.body;

    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

    if (!userAnswer) {
      return res.status(400).json({ message: "Answer is required" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check if answer is correct (case-insensitive, trimmed)
    const isCorrect = question.answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();

    // Save the attempt (upsert)
    const attempt = await prisma.attempt.upsert({
      where: {
        userId_questionId: {
          userId: userId,
          questionId: questionId
        }
      },
      update: {
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        attemptedAt: new Date()
      },
      create: {
        userId: userId,
        questionId: questionId,
        userAnswer: userAnswer,
        isCorrect: isCorrect
      }
    });

    // Format the response with the expected structure
    res.json({
      id: attempt.id,
      correct: isCorrect,
      submittedAnswer: userAnswer,
      correctAnswer: question.answer,
      createdAt: attempt.attemptedAt
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ message: "Failed to submit answer" });
  }
});

// GET /api/questions/:questionId/attempt - Check user's attempt for a question
router.get("/:questionId/attempt", authenticate, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const userId = req.user.userId;

    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

    const attempt = await prisma.attempt.findUnique({
      where: {
        userId_questionId: {
          userId: userId,
          questionId: questionId
        }
      }
    });

    res.json({
      questionId: questionId,
      attempted: !!attempt,
      isCorrect: attempt?.isCorrect || false,
      userAnswer: attempt?.userAnswer || null
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    res.status(500).json({ message: "Failed to fetch attempt" });
  }
});

// GET /api/questions/user/stats - Get user's quiz statistics
router.get("/user/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalAttempts = await prisma.attempt.count({
      where: { userId: userId }
    });

    const correctAttempts = await prisma.attempt.count({
      where: { 
        userId: userId,
        isCorrect: true
      }
    });

    const totalQuestions = await prisma.question.count();

    const attemptedQuestions = await prisma.attempt.count({
      where: { userId: userId }
    });

    res.json({
      totalAttempts: totalAttempts,
      correctAnswers: correctAttempts,
      incorrectAnswers: totalAttempts - correctAttempts,
      successRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
      questionsAttempted: attemptedQuestions,
      totalQuestions: totalQuestions,
      completionRate: totalQuestions > 0 ? Math.round((attemptedQuestions / totalQuestions) * 100) : 0
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// POST /api/questions - Create new question with optional image
router.post("/", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { question, answer, keywords } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!question || !answer) {
      return res.status(400).json({ msg: "Question and answer are required" });
    }

    const keywordArray = parseKeywords(keywords);

    const newQuestion = await prisma.question.create({
      data: {
        question,
        answer,
        imageUrl,
        userId: req.user.userId,
        keywords: keywordArray.length
          ? {
              connectOrCreate: keywordArray.map((kw) => ({
                where: { name: kw.toLowerCase() },
                create: { name: kw.toLowerCase() },
              })),
            }
          : undefined,
      },
      include: { 
        keywords: true, 
        user: true
      }
    });

    res.status(201).json({
      id: newQuestion.id,
      question: newQuestion.question,
      answer: newQuestion.answer,
      imageUrl: newQuestion.imageUrl,
      userId: newQuestion.userId,
      keywords: newQuestion.keywords ? newQuestion.keywords.map((k) => k.name) : [],
      userName: newQuestion.user?.name || null,
      totalAttempts: 0,
      correctAttempts: 0,
      solved: false,
      attempted: false
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: "Failed to create question", error: error.message });
  }
});

// PUT /api/questions/:questionId - Update question
router.put("/:questionId", authenticate, isOwner, upload.single("image"), async (req, res) => {
  try {
    const { question: newQuestion, answer, keywords, existingImageUrl } = req.body;
    const userId = req.user.userId;
    
    let imageUrl = existingImageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!newQuestion || !answer) {
      return res.status(400).json({ msg: "Question and answer are required" });
    }

    const keywordArray = parseKeywords(keywords);

    const updatedQuestion = await prisma.question.update({
      where: { id: req.question.id },
      data: {
        question: newQuestion,
        answer,
        imageUrl,
        keywords: keywordArray.length
          ? {
              set: [],
              connectOrCreate: keywordArray.map((kw) => ({
                where: { name: kw.toLowerCase() },
                create: { name: kw.toLowerCase() },
              })),
            }
          : undefined,
      },
      include: { 
        keywords: true, 
        user: true,
        attempts: {
          where: { userId: userId },
          take: 1
        }
      }
    });

    const totalAttempts = await prisma.attempt.count({
      where: { questionId: updatedQuestion.id }
    });
    
    const correctAttempts = await prisma.attempt.count({
      where: { 
        questionId: updatedQuestion.id,
        isCorrect: true
      }
    });
    
    const userAttempt = updatedQuestion.attempts && updatedQuestion.attempts.length > 0 ? updatedQuestion.attempts[0] : null;
    const solved = userAttempt && userAttempt.isCorrect;

    res.json({
      id: updatedQuestion.id,
      question: updatedQuestion.question,
      answer: updatedQuestion.answer,
      imageUrl: updatedQuestion.imageUrl,
      userId: updatedQuestion.userId,
      keywords: updatedQuestion.keywords ? updatedQuestion.keywords.map(k => k.name) : [],
      userName: updatedQuestion.user?.name || null,
      totalAttempts: totalAttempts,
      correctAttempts: correctAttempts,
      solved: solved,
      attempted: !!userAttempt,
      userAnswer: userAttempt?.userAnswer || null
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: "Failed to update question" });
  }
});

// DELETE /api/questions/:questionId - Delete question
router.delete("/:questionId", authenticate, isOwner, async (req, res) => {
  try {
    await prisma.question.delete({
      where: { id: req.question.id }
    });

    res.json({ 
      msg: "Question deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Failed to delete question" });
  }
});

// GET /api/questions/keywords/all - Get all keywords
router.get("/keywords/all", authenticate, async (req, res) => {
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