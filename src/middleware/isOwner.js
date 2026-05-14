const prisma = require("../lib/prisma");
const { NotFoundError, ForbiddenError } = require("../lib/errors");

async function isOwner(req, res, next) {
  try {
    const id = Number(req.params.questionId);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    const question = await prisma.question.findUnique({
      where: { id },
      include: { keywords: true },
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.userId !== req.user.userId) {
      return res.status(403).json({ message: "You can only modify your own questions" });
    }

    req.question = question;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = isOwner;