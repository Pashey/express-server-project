const request = require("supertest");
const app = require("../src/app");
const { resetDb, registerAndLogin, createQuestion } = require("./helpers");

beforeEach(resetDb);

describe("Authorization - Ownership", () => {
  it("returns 403 when editing someone else's question", async () => {
    const aliceToken = await registerAndLogin("alice@test.io", "Alice", "password123");
    const question = await createQuestion(aliceToken, { question: "Alice's question", answer: "Alice's answer" });
    const bobToken = await registerAndLogin("bob@test.io", "Bob", "password123");
    const res = await request(app).put(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ question: "hijacked", answer: "hijacked", keywords: ["hacked"] });
    expect(res.status).toBe(403);
  });

  it("returns 403 when deleting someone else's question", async () => {
    const aliceToken = await registerAndLogin("alice2@test.io", "Alice2", "password123");
    const question = await createQuestion(aliceToken, { question: "Alice's question 2", answer: "Alice's answer 2" });
    const bobToken = await registerAndLogin("bob2@test.io", "Bob2", "password123");
    const res = await request(app).delete(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });

  it("allows owner to edit their own question", async () => {
    const aliceToken = await registerAndLogin("alice3@test.io", "Alice3", "password123");
    const question = await createQuestion(aliceToken, { question: "Original", answer: "Original answer" });
    const res = await request(app).put(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ question: "Updated", answer: "Updated answer", keywords: ["updated"] });
    expect(res.status).toBe(200);
  });

  it("allows owner to delete their own question", async () => {
    const aliceToken = await registerAndLogin("alice4@test.io", "Alice4", "password123");
    const question = await createQuestion(aliceToken, { question: "To delete", answer: "Delete this" });
    const res = await request(app).delete(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
  });
});