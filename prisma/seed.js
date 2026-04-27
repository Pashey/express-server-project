const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

// Quiz questions data
const quizQuestions = [
  {
    question: "When did Finland gain independence?",
    answer: "1917",
    keywords: ["history", "finland", "independence", "year"]
  },
  {
    question: "What is the capital of Finland?",
    answer: "Helsinki",
    keywords: ["geography", "finland", "capital", "city"]
  },
  {
    question: "What currency is used in Finland?",
    answer: "Euro",
    keywords: ["economy", "finland", "currency", "europe"]
  },
  {
    question: "What is the most spoken language in Finland?",
    answer: "Finnish",
    keywords: ["language", "finland", "culture"]
  },
  {
    question: "What is the national animal of Finland?",
    answer: "Brown bear",
    keywords: ["animals", "finland", "nature", "wildlife"]
  },
  {
    question: "What is the national bird of Finland?",
    answer: "Whooper swan",
    keywords: ["animals", "finland", "birds", "nature"]
  },
  {
    question: "What is the longest river in Finland?",
    answer: "Kemijoki",
    keywords: ["geography", "finland", "river", "nature"]
  },
  {
    question: "What is the largest lake in Finland?",
    answer: "Lake Saimaa",
    keywords: ["geography", "finland", "lake", "nature"]
  }
];

async function main() {
  console.log("🌱 Starting database seeding...");

  // First, clean up existing data (order matters due to foreign keys)
  console.log("📦 Clearing existing data...");
  await prisma.keyword.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
  
  console.log("✓ Cleared existing data");

  // Create a default/admin user
  console.log("👤 Creating default user...");
  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log(`✅ Created user: ${user.email} (ID: ${user.id})`);
  console.log(`   Password: 1234`);

  // Create quiz questions associated with the user
  console.log("📝 Creating quiz questions...");
  
  for (const q of quizQuestions) {
    const createdQuestion = await prisma.question.create({
      data: {
        question: q.question,
        answer: q.answer,
        userId: user.id,  // Associate question with the user
        keywords: {
          connectOrCreate: q.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
    console.log(`  ✓ Added: ${createdQuestion.question.substring(0, 50)}...`);
  }

  // Display statistics
  const questionCount = await prisma.question.count();
  const keywordCount = await prisma.keyword.count();
  const userCount = await prisma.user.count();
  
  console.log("\n📊 Database Statistics:");
  console.log(`   👥 Total users: ${userCount}`);
  console.log(`   📚 Total questions: ${questionCount}`);
  console.log(`   🏷️  Total keywords: ${keywordCount}`);
  
  // Display all keywords
  const allKeywords = await prisma.keyword.findMany({
    orderBy: { name: "asc" }
  });
  console.log("\n📋 Available keywords:");
  console.log(allKeywords.map(k => `  - ${k.name}`).join("\n"));
  
  console.log("\n✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("\n❌ Error seeding database:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("\n🔌 Database connection closed");
  });