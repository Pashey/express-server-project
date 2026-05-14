const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const upload = require("../middleware/upload");
const { ValidationError, NotFoundError } = require("../lib/errors");

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

// ✅ Named routes FIRST — before /:questionId
router.get("/user/stats", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const totalAttempts = await prisma.attempt.count({ where: { userId } });
    const correctAttempts = await prisma.attempt.count({ where: { userId, isCorrect: true } });
    const totalQuestions = await prisma.question.count();
    const attemptedQuestions = await prisma.attempt.count({ where: { userId } });

    res.json({
      totalAttempts,
      correctAnswers: correctAttempts,
      incorrectAnswers: totalAttempts - correctAttempts,
      successRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
      questionsAttempted: attemptedQuestions,
      totalQuestions,
      completionRate: totalQuestions > 0 ? Math.round((attemptedQuestions / totalQuestions) * 100) : 0
    });
  } catch (error) {
    next(error);
  }
});

router.get("/keywords/all", authenticate, async (req, res, next) => {
  try {
    const keywords = await prisma.keyword.findMany({ orderBy: { name: "asc" } });
    res.json(keywords.map(k => k.name));
  } catch (error) {
    next(error);
  }
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 5 } = req.query;
    const userId = req.user.userId;

    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageLimit = Math.max(1, Math.min(100, parseInt(limit) || 5));
    const skip = (currentPage - 1) * pageLimit;

    let where = {};
    if (keyword) {
      where = { keywords: { some: { name: keyword.toLowerCase() } } };
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        keywords: true,
        user: true,
        likes: { where: { userId }, take: 1 },
        attempts: { where: { userId }, take: 1 }
      },
      orderBy: { id: "asc" },
      skip,
      take: pageLimit
    });

    const totalQuestions = await prisma.question.count({ where });
    const totalPages = Math.ceil(totalQuestions / pageLimit);

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      imageUrl: q.imageUrl,
      userId: q.userId,
      keywords: q.keywords?.map(k => k.name) || [],
      userName: q.user?.name || null,
      likeCount: q.likes?.length || 0,
      likedByUser: (q.likes?.length || 0) > 0,
      solved: (q.attempts?.length > 0 && q.attempts[0].isCorrect) || false,
      attempted: (q.attempts?.length || 0) > 0
    }));

    res.json({ data: formattedQuestions, page: currentPage, limit: pageLimit, total: totalQuestions, totalPages });
  } catch (error) {
    next(error);
  }
});

// ✅ Param routes AFTER named routes
router.get("/:questionId", authenticate, async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const userId = req.user.userId;

    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { keywords: true, user: true, likes: { where: { userId } }, attempts: { where: { userId } } }
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json({
      id: question.id,
      question: question.question,
      answer: question.answer,
      imageUrl: question.imageUrl,
      userId: question.userId,
      keywords: question.keywords?.map(k => k.name) || [],
      userName: question.user?.name || null,
      likeCount: question.likes?.length || 0,
      likedByUser: (question.likes?.length || 0) > 0,
      solved: (question.attempts?.length > 0 && question.attempts[0].isCorrect) || false,
      attempted: (question.attempts?.length || 0) > 0
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:questionId/like", authenticate, async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const userId = req.user.userId;
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    await prisma.like.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {},
      create: { userId, questionId }
    });

    const likeCount = await prisma.like.count({ where: { questionId } });
    res.json({ liked: true, likeCount });
  } catch (error) {
    next(error);
  }
});

router.delete("/:questionId/like", authenticate, async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const userId = req.user.userId;
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    await prisma.like.deleteMany({ where: { userId, questionId } });
    const likeCount = await prisma.like.count({ where: { questionId } });
    res.json({ liked: false, likeCount });
  } catch (error) {
    next(error);
  }
});

router.post("/:questionId/play", authenticate, async (req, res, next) => {
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

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect = question.answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();

    const attempt = await prisma.attempt.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { userAnswer, isCorrect, attemptedAt: new Date() },
      create: { userId, questionId, userAnswer, isCorrect }
    });

    res.json({ id: attempt.id, correct: isCorrect, submittedAnswer: userAnswer, correctAnswer: question.answer, createdAt: attempt.attemptedAt });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, upload.single("image"), async (req, res, next) => {
  try {
    const { question, answer, keywords } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Question and answer are required" });
    }

    const keywordArray = parseKeywords(keywords);
    const newQuestion = await prisma.question.create({
      data: {
        question,
        answer,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        userId: req.user.userId,
        keywords: keywordArray.length ? {
          connectOrCreate: keywordArray.map(kw => ({
            where: { name: kw.toLowerCase() },
            create: { name: kw.toLowerCase() }
          }))
        } : undefined
      },
      include: { keywords: true, user: true }
    });

    res.status(201).json({
      id: newQuestion.id,
      question: newQuestion.question,
      answer: newQuestion.answer,
      imageUrl: newQuestion.imageUrl,
      userId: newQuestion.userId,
      keywords: newQuestion.keywords?.map(k => k.name) || [],
      userName: newQuestion.user?.name || null,
      likeCount: 0,
      likedByUser: false,
      solved: false,
      attempted: false
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:questionId", authenticate, isOwner, upload.single("image"), async (req, res, next) => {
  try {
    const { question, answer, keywords, existingImageUrl } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Question and answer are required" });
    }

    const keywordArray = parseKeywords(keywords);
    const updatedQuestion = await prisma.question.update({
      where: { id: req.question.id },
      data: {
        question,
        answer,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : existingImageUrl,
        keywords: keywordArray.length ? {
          set: [],
          connectOrCreate: keywordArray.map(kw => ({
            where: { name: kw.toLowerCase() },
            create: { name: kw.toLowerCase() }
          }))
        } : undefined
      },
      include: { keywords: true, user: true }
    });

    res.json({
      id: updatedQuestion.id,
      question: updatedQuestion.question,
      answer: updatedQuestion.answer,
      imageUrl: updatedQuestion.imageUrl,
      userId: updatedQuestion.userId,
      keywords: updatedQuestion.keywords?.map(k => k.name) || [],
      userName: updatedQuestion.user?.name || null
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:questionId", authenticate, isOwner, async (req, res, next) => {
  try {
    await prisma.like.deleteMany({ where: { questionId: req.question.id } });
    await prisma.attempt.deleteMany({ where: { questionId: req.question.id } });
    await prisma.question.delete({ where: { id: req.question.id } });
    res.json({ msg: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;