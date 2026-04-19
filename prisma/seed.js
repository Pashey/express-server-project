const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Function to reset auto-increment counters
async function resetAutoIncrement() {
  try {
    // Reset auto-increment for MySQL tables
    await prisma.$executeRawUnsafe(`ALTER TABLE questions AUTO_INCREMENT = 1`);
    await prisma.$executeRawUnsafe(`ALTER TABLE keywords AUTO_INCREMENT = 1`);
    console.log("✓ Auto-increment counters reset");
  } catch (error) {
    console.log("Note: Auto-increment reset skipped (tables might be empty)");
  }
}

// Seed data - Questions about Finland
const seedQuestions = [
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
  
  // Reset auto-increment counters
  await resetAutoIncrement();
  
  // Clear existing data (order matters due to foreign keys)
  console.log("📦 Clearing existing data...");
  await prisma.keyword.deleteMany();
  await prisma.question.deleteMany();
  
  console.log(`✓ Cleared existing questions and keywords`);
  
  // Insert new data
  console.log("📝 Inserting new questions...");
  
  for (const q of seedQuestions) {
    const createdQuestion = await prisma.question.create({
      data: {
        question: q.question,
        answer: q.answer,
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
  
  // Show statistics
  const questionCount = await prisma.question.count();
  const keywordCount = await prisma.keyword.count();
  
  console.log("\n✅ Seeding completed successfully!");
  console.log(`📚 Total questions: ${questionCount}`);
  console.log(`🏷️  Total keywords: ${keywordCount}`);
  
  // Display all keywords
  const allKeywords = await prisma.keyword.findMany({
    orderBy: { name: "asc" }
  });
  console.log("\n📋 Available keywords:");
  console.log(allKeywords.map(k => `  - ${k.name}`).join("\n"));
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