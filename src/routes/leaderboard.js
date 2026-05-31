const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        attempts: {
          where: { isCorrect: true },
          select: { id: true }
        }
      }
    });

    const leaderboard = topUsers
      .map(u => ({
        id: u.id,
        name: u.name,
        correctAnswers: u.attempts.length
      }))
      .sort((a, b) => b.correctAnswers - a.correctAnswers)
      .slice(0, 5);

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

module.exports = router;