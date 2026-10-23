import { randomUUID } from 'node:crypto';
import { initDb, getDb } from './index.js';

export function seedDatabase() {
  const db = getDb();

  const existing = db.prepare('SELECT COUNT(*) as count FROM quizzes').get() as { count: number };
  if (existing.count > 0) {
    console.log('Database already has quizzes. Skipping seed.');
    return;
  }

  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (id, title, description, category) VALUES (?, ?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO questions (id, quiz_id, type, text, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );

  const addQuiz = (title: string, description: string, category: string) => {
    const id = randomUUID();
    insertQuiz.run(id, title, description, category);
    return id;
  };

  const addQuestion = (
    quizId: string,
    type: string,
    text: string,
    timeLimit: number,
    points: number,
    explanation: string,
    orderIndex: number,
    answers: { text: string; isCorrect: boolean }[]
  ) => {
    const id = randomUUID();
    insertQuestion.run(id, quizId, type, text, timeLimit, points, explanation, orderIndex);
    answers.forEach((a, i) => {
      insertAnswer.run(randomUUID(), id, a.text, a.isCorrect ? 1 : 0, i);
    });
  };

  const seedAll = db.transaction(() => {
    const gk = addQuiz('General Knowledge', 'Test your knowledge of the world around you!', 'General');
    addQuestion(gk, 'multiple-choice', 'What is the largest ocean on Earth?', 20, 1000,
      'The Pacific Ocean covers about 63 million square miles.', 0, [
        { text: 'Atlantic Ocean', isCorrect: false },
        { text: 'Pacific Ocean', isCorrect: true },
        { text: 'Indian Ocean', isCorrect: false },
        { text: 'Arctic Ocean', isCorrect: false },
      ]);
    addQuestion(gk, 'multiple-choice', 'Which planet is known as the Red Planet?', 20, 1000,
      'Mars appears red due to iron oxide (rust) on its surface.', 1, [
        { text: 'Venus', isCorrect: false },
        { text: 'Jupiter', isCorrect: false },
        { text: 'Mars', isCorrect: true },
        { text: 'Saturn', isCorrect: false },
      ]);
    addQuestion(gk, 'multiple-choice', 'How many continents are there on Earth?', 15, 800,
      'The seven continents are Africa, Antarctica, Asia, Australia, Europe, North America, and South America.', 2, [
        { text: '5', isCorrect: false },
        { text: '6', isCorrect: false },
        { text: '7', isCorrect: true },
        { text: '8', isCorrect: false },
      ]);
    addQuestion(gk, 'multiple-choice', 'What is the chemical symbol for gold?', 20, 1000,
      'Au comes from the Latin word "aurum" meaning gold.', 3, [
        { text: 'Go', isCorrect: false },
        { text: 'Gd', isCorrect: false },
        { text: 'Au', isCorrect: true },
        { text: 'Ag', isCorrect: false },
      ]);
    addQuestion(gk, 'multiple-choice', 'Which country has the most time zones?', 30, 1200,
      'France has 12 time zones, mostly due to its overseas territories.', 4, [
        { text: 'Russia', isCorrect: false },
        { text: 'United States', isCorrect: false },
        { text: 'China', isCorrect: false },
        { text: 'France', isCorrect: true },
      ]);

    const sci = addQuiz('Science Basics', 'Explore fundamental science concepts!', 'Science');
    addQuestion(sci, 'multiple-choice', 'What gas do plants absorb from the atmosphere?', 20, 1000,
      'Plants use carbon dioxide in photosynthesis to produce oxygen and glucose.', 0, [
        { text: 'Oxygen', isCorrect: false },
        { text: 'Nitrogen', isCorrect: false },
        { text: 'Carbon Dioxide', isCorrect: true },
        { text: 'Hydrogen', isCorrect: false },
      ]);
    addQuestion(sci, 'multiple-choice', 'What is the hardest natural substance on Earth?', 20, 1000,
      'Diamond scores 10 on the Mohs hardness scale.', 1, [
        { text: 'Granite', isCorrect: false },
        { text: 'Diamond', isCorrect: true },
        { text: 'Quartz', isCorrect: false },
        { text: 'Titanium', isCorrect: false },
      ]);
    addQuestion(sci, 'multiple-choice', 'How many bones are in the adult human body?', 25, 1000,
      'Babies are born with about 270 bones, but many fuse together as they grow.', 2, [
        { text: '186', isCorrect: false },
        { text: '206', isCorrect: true },
        { text: '226', isCorrect: false },
        { text: '256', isCorrect: false },
      ]);
    addQuestion(sci, 'multiple-choice', 'What is the speed of light in a vacuum (approximately)?', 30, 1200,
      'Light travels at about 300,000 kilometres per second.', 3, [
        { text: '150,000 km/s', isCorrect: false },
        { text: '300,000 km/s', isCorrect: true },
        { text: '450,000 km/s', isCorrect: false },
        { text: '600,000 km/s', isCorrect: false },
      ]);
    addQuestion(sci, 'multiple-choice', 'Which element has the atomic number 1?', 15, 800,
      'Hydrogen is the lightest and most abundant element in the universe.', 4, [
        { text: 'Helium', isCorrect: false },
        { text: 'Hydrogen', isCorrect: true },
        { text: 'Lithium', isCorrect: false },
        { text: 'Carbon', isCorrect: false },
      ]);

    const tf = addQuiz('True or False Challenge', 'Can you separate fact from fiction?', 'Mixed');
    addQuestion(tf, 'true-false', 'The Great Wall of China is visible from space with the naked eye.', 15, 800,
      'This is a common myth. The wall is too narrow to be seen from space without aid.', 0, [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ]);
    addQuestion(tf, 'true-false', 'Octopuses have three hearts.', 15, 800,
      'Two branchial hearts pump blood to the gills, and one systemic heart pumps it to the body.', 1, [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]);
    addQuestion(tf, 'true-false', 'Lightning never strikes the same place twice.', 15, 800,
      'Lightning frequently strikes the same place. The Empire State Building is struck about 20-25 times per year.', 2, [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ]);
    addQuestion(tf, 'true-false', 'Sound travels faster in water than in air.', 15, 1000,
      'Sound travels about 4.3 times faster in water than in air because water molecules are closer together.', 3, [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]);
    addQuestion(tf, 'true-false', 'Bananas are classified as berries in botany.', 15, 1000,
      'Botanically, bananas qualify as berries while strawberries do not.', 4, [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]);
  });

  seedAll();
  console.log('Seeded 3 quizzes with 15 total questions.');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  initDb();
  seedDatabase();
}
