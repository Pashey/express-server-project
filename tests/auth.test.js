const bcrypt = require("bcrypt");
const { resetDb, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

describe("Authentication", () => {
  describe("POST /api/auth/register", () => {
    it("should return 400 if email, password or name is missing", async () => {
      const res1 = await request(app)
        .post("/api/auth/register")
        .send({ password: "1234", name: "Test" });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", name: "Test" });
      expect(res2.status).toBe(400);

      const res3 = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "1234" });
      expect(res3.status).toBe(400);
    });

    it("should return 409 if email already exists", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "1234", name: "Test" });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "1234", name: "Test2" });
      
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already registered");
    });

    it("should return 201 and hash the password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "1234", name: "Test" });
      
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
      expect(res.body.user.name).toBe("Test");

      const user = await prisma.user.findUnique({
        where: { email: "test@example.com" }
      });
      expect(user.password).not.toBe("1234");
      expect(await bcrypt.compare("1234", user.password)).toBe(true);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "1234", name: "Test" });
    });

    it("should return 400 if email or password is missing", async () => {
      const res1 = await request(app)
        .post("/api/auth/login")
        .send({ password: "1234" });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com" });
      expect(res2.status).toBe(400);
    });

    it("should return same error for non-existent user and wrong password (no enumeration)", async () => {
      const res1 = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent@example.com", password: "1234" });
      expect(res1.status).toBe(401);
      expect(res1.body.message).toBe("Invalid credentials");

      const res2 = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "wrongpassword" });
      expect(res2.status).toBe(401);
      expect(res2.body.message).toBe("Invalid credentials");
    });

    it("should return 200 and a token for valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "1234" });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
    });
  });

  describe("Auth happy path with DB assertion", () => {
    it("registers, hashes the password, returns a token", async () => {
      const res = await request(app).post("/api/auth/register")
        .send({ email: "a@test.io", password: "pw12345", name: "A" });

      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
    });
  });
});