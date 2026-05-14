const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

async function resetDb() {
  try {
    await prisma.attempt.deleteMany();
  } catch (e) {}
  try {
    await prisma.like.deleteMany();
  } catch (e) {}
  try {
    await prisma.question.deleteMany();
  } catch (e) {}
  try {
    await prisma.keyword.deleteMany();
  } catch (e) {}
  try {
    await prisma.user.deleteMany();
  } catch (e) {}
}

async function registerAndLogin(email = "a@test.io", name = "A", password = "pw12345") {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password, name });
  
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  
  return res.body.token;
}

async function createQuestion(token, overrides = {}) {
  const res = await request(app)
    .post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      question: "What is the capital of Finland?",
      answer: "Helsinki",
      keywords: ["geography", "finland", "capital"],
      ...overrides
    });
  
  return res.body;
}

module.exports = {
  request,
  app,
  prisma,
  resetDb,
  registerAndLogin,
  createQuestion,
};