const CONFIG = {
  API_URL: "",
  ROUTES: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    PROFILE: "/api/auth/profile",
    QUESTIONS: "/api/questions",
    KEYWORDS: "/api/questions/keywords/all",
    LIKE: (id) => `/api/questions/${id}/like`,
  },
  FIELDS: {
    LOGIN: ["email", "password"],
    REGISTER: ["email", "password", "name"],
    QUESTION: ["question", "answer", "keywords"],
  },
  POSTS_PER_PAGE: 6,
  STORAGE_KEY: "quiz_token",
};