const request = require("supertest");
const app = require("../src/app");
const { resetDb, registerAndLogin, createQuestion } = require("./helpers");

describe("Questions API (CRUD)", () => {
  let token;
  let otherUserToken;
  let questionId;

  beforeEach(async () => {
    await resetDb();
    token = await registerAndLogin("owner@test.com", "Owner");
    otherUserToken = await registerAndLogin("other@test.com", "Other");
    
    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        question: "What is the capital of Finland?",
        answer: "Helsinki",
        keywords: ["geography", "finland"]
      });
    questionId = res.body.id;
  });

  describe("GET /api/questions", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/questions");
      expect(res.status).toBe(401);
    });

    it("should return 200 with list of questions", async () => {
      const res = await request(app)
        .get("/api/questions")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should support pagination", async () => {
      await createQuestion(token, { question: "Question 2" });
      await createQuestion(token, { question: "Question 3" });
      await createQuestion(token, { question: "Question 4" });

      const res = await request(app)
        .get("/api/questions?page=1&limit=2")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.totalPages).toBeDefined();
    });

    it("should support keyword search", async () => {
      const res = await request(app)
        .get("/api/questions?keyword=finland")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/questions/:questionId", () => {
    it("should return 404 for non-existent question", async () => {
      const res = await request(app)
        .get("/api/questions/99999")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(404);
    });

    it("should return 200 with question details", async () => {
      const res = await request(app)
        .get(`/api/questions/${questionId}`)
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(questionId);
    });
  });

  describe("POST /api/questions", () => {
    it("should return 401 without token", async () => {
      const res = await request(app)
        .post("/api/questions")
        .send({ question: "Test", answer: "Answer" });
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid body (missing question)", async () => {
      const res = await request(app)
        .post("/api/questions")
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "Answer" });
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid body (missing answer)", async () => {
      const res = await request(app)
        .post("/api/questions")
        .set("Authorization", `Bearer ${token}`)
        .send({ question: "Test" });
      expect(res.status).toBe(400);
    });

    it("should return 201 and create a question", async () => {
      const res = await request(app)
        .post("/api/questions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          question: "What is the national animal of Finland?",
          answer: "Brown bear",
          keywords: ["animals", "finland"]
        });
      
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });
  });

  describe("PUT /api/questions/:questionId", () => {
    it("should return 403 when editing someone else's question", async () => {
      const res = await request(app)
        .put(`/api/questions/${questionId}`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({
          question: "Updated question",
          answer: "Updated answer"
        });
      
      expect(res.status).toBe(403);
    });

    it("should return 200 and update the question", async () => {
      const res = await request(app)
        .put(`/api/questions/${questionId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          question: "Updated question",
          answer: "Updated answer",
          keywords: ["updated", "test"]
        });
      
      expect(res.status).toBe(200);
      expect(res.body.question).toBe("Updated question");
      expect(res.body.answer).toBe("Updated answer");
    });
  });

  describe("DELETE /api/questions/:questionId", () => {
    it("should return 403 when deleting someone else's question", async () => {
      const res = await request(app)
        .delete(`/api/questions/${questionId}`)
        .set("Authorization", `Bearer ${otherUserToken}`);
      
      expect(res.status).toBe(403);
    });

    it("should return 200 and delete the question", async () => {
      const res = await request(app)
        .delete(`/api/questions/${questionId}`)
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      
      const getRes = await request(app)
        .get(`/api/questions/${questionId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });
  });
});