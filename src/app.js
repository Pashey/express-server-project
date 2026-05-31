const path = require("path");
const express = require("express");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const leaderboardRouter = require("./routes/leaderboard");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url.startsWith("/uploads"),
  },
}));

app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/leaderboard", leaderboardRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Quiz API",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      profile: "GET /api/auth/profile",
      getAllQuestions: "GET /api/questions",
      getQuestionById: "GET /api/questions/:id",
      createQuestion: "POST /api/questions (multipart/form-data for images)",
      updateQuestion: "PUT /api/questions/:id",
      deleteQuestion: "DELETE /api/questions/:id",
      searchByKeyword: "GET /api/questions?keyword=finland",
      allKeywords: "GET /api/questions/keywords/all",
      likeQuestion: "POST /api/questions/:id/like",
      unlikeQuestion: "DELETE /api/questions/:id/like",
      leaderboard: "GET /api/leaderboard",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

module.exports = app;