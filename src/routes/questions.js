const express = require("express");
const router = express.Router();

// Import the data
const questions = require("../data/questions");

// GET /questions
// List all questions and allow keyword search
router.get("/", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json(questions);
  }

  const filteredQuestions = questions.filter(question =>
    question.keywords.includes(keyword.toLowerCase())
  );

  res.json(filteredQuestions);
});

// GET /questions/:questionId
router.get("/:questionId", (req, res) => {
  const questionId = Number(req.params.questionId);

  const question = questions.find((q) => q.id === questionId); // changed posts → questions, p → q

  if (!question) {
    return res.status(404).json({ message: "Question not found" }); // updated message
  }

  res.json(question);
});

router.post("/", (req, res) => {
  const { question, answer, keywords } = req.body; // fixed destructuring

  // Validate required fields
  if (!question || !answer) {
    return res.status(400).json({ msg: "Question and answer are required" });
  }

  // Generate new id
  const existingIds = questions.map(q => q.id); // was posts → questions
  const maxId = existingIds.length ? Math.max(...existingIds) : 0;

  const newQuestion = {
    id: maxId + 1,
    question,
    answer,
    keywords: Array.isArray(keywords) ? keywords : []
  };

  questions.push(newQuestion);

  res.status(201).json(newQuestion);
});

router.put("/:questionId", (req, res) => {
  const questionId = Number(req.params.questionId);

  const question = questions.find(q => q.id === questionId); // posts → questions, p → q

  if (!question) {
    return res.status(404).json({ msg: "Question not found" });
  }

  const { question: newQuestion, answer, keywords } = req.body; // destructure incoming data

  if (!newQuestion || !answer) {
    return res.status(400).json({ msg: "Question and answer are required" });
  }

  question.question = newQuestion;
  question.answer = answer;
  question.keywords = Array.isArray(keywords) ? keywords : [];

  res.json(question);
});

router.delete("/:questionId", (req, res) => {
  const questionId = Number(req.params.questionId);

  const questionIndex = questions.findIndex(q => q.id === questionId); // posts → questions, p → q

  if (questionIndex === -1) {
    return res.status(404).json({ msg: "Question not found" });
  }

  const deletedQuestion = questions.splice(questionIndex, 1);

  res.json({
    msg: "Question deleted successfully",
    question: deletedQuestion[0] // splice returns an array
  });
});

module.exports = router;