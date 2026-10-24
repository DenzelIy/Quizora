import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedUpgradeA() {
  const db = getDb();

  const check = db.prepare(
    "SELECT COUNT(*) as count FROM questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.title = 'Basic Arithmetic'"
  ).get() as { count: number };
  if (check.count > 10) return;

  const insertQuestion = db.prepare(
    'INSERT INTO questions (id, quiz_id, type, text, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );

  const getQuizId = (title: string): string | null => {
    const row = db.prepare('SELECT id FROM quizzes WHERE title = ?').get(title) as { id: string } | undefined;
    return row?.id ?? null;
  };

  const addQ = (
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
    // ─── GENERAL KNOWLEDGE (currently 5, add 10 starting at 5) ───
    const gk = getQuizId('General Knowledge');
    if (gk) {
      addQ(gk, 'multiple-choice', 'What is the longest river in the world?', 20, 1000,
        'The Nile stretches approximately 6,650 km through northeastern Africa.', 5, [
          { text: 'Amazon', isCorrect: false },
          { text: 'Nile', isCorrect: true },
          { text: 'Yangtze', isCorrect: false },
          { text: 'Mississippi', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'Which metal is liquid at room temperature?', 20, 1000,
        'Mercury is the only metal that is liquid at standard room temperature (about 25°C).', 6, [
          { text: 'Lead', isCorrect: false },
          { text: 'Mercury', isCorrect: true },
          { text: 'Aluminium', isCorrect: false },
          { text: 'Tin', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'What is the capital of Australia?', 20, 1000,
        'Canberra is the capital of Australia, not Sydney or Melbourne.', 7, [
          { text: 'Sydney', isCorrect: false },
          { text: 'Melbourne', isCorrect: false },
          { text: 'Canberra', isCorrect: true },
          { text: 'Brisbane', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'How many teeth does an adult human have?', 15, 800,
        'Adults typically have 32 teeth, including 4 wisdom teeth.', 8, [
          { text: '28', isCorrect: false },
          { text: '30', isCorrect: false },
          { text: '32', isCorrect: true },
          { text: '36', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'What is the smallest bone in the human body?', 20, 1000,
        'The stapes (stirrup) in the middle ear is only about 3mm long.', 9, [
          { text: 'Stapes (stirrup)', isCorrect: true },
          { text: 'Patella (kneecap)', isCorrect: false },
          { text: 'Phalanx (finger bone)', isCorrect: false },
          { text: 'Coccyx (tailbone)', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'Which gas makes up most of Earth\'s atmosphere?', 15, 800,
        'Nitrogen makes up about 78% of the atmosphere, followed by oxygen at 21%.', 10, [
          { text: 'Oxygen', isCorrect: false },
          { text: 'Carbon dioxide', isCorrect: false },
          { text: 'Nitrogen', isCorrect: true },
          { text: 'Argon', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'What year did World War II end?', 15, 1000,
        'World War II ended in 1945 with the surrender of Japan.', 11, [
          { text: '1943', isCorrect: false },
          { text: '1944', isCorrect: false },
          { text: '1945', isCorrect: true },
          { text: '1946', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'Who painted the Sistine Chapel ceiling?', 20, 1000,
        'Michelangelo painted the ceiling between 1508 and 1512.', 12, [
          { text: 'Leonardo da Vinci', isCorrect: false },
          { text: 'Raphael', isCorrect: false },
          { text: 'Michelangelo', isCorrect: true },
          { text: 'Donatello', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'What is the tallest mountain in the world?', 15, 800,
        'Mount Everest stands at 8,849 metres above sea level.', 13, [
          { text: 'K2', isCorrect: false },
          { text: 'Mount Kilimanjaro', isCorrect: false },
          { text: 'Mount Everest', isCorrect: true },
          { text: 'Mont Blanc', isCorrect: false },
        ]);
      addQ(gk, 'multiple-choice', 'Which blood cells fight infection?', 15, 1000,
        'White blood cells (leukocytes) are part of the immune system.', 14, [
          { text: 'Red blood cells', isCorrect: false },
          { text: 'White blood cells', isCorrect: true },
          { text: 'Platelets', isCorrect: false },
          { text: 'Plasma', isCorrect: false },
        ]);
    }

    // ─── SCIENCE BASICS (currently 5, add 10 starting at 5) ───
    const sci = getQuizId('Science Basics');
    if (sci) {
      addQ(sci, 'multiple-choice', 'What is the process of water changing to vapour called?', 15, 800,
        'Evaporation is when liquid water turns into water vapour.', 5, [
          { text: 'Condensation', isCorrect: false },
          { text: 'Evaporation', isCorrect: true },
          { text: 'Precipitation', isCorrect: false },
          { text: 'Sublimation', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What type of rock is formed from cooled lava?', 20, 1000,
        'Igneous rock forms when molten rock (magma or lava) cools and solidifies.', 6, [
          { text: 'Sedimentary', isCorrect: false },
          { text: 'Metamorphic', isCorrect: false },
          { text: 'Igneous', isCorrect: true },
          { text: 'Limestone', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What is the centre of an atom called?', 15, 800,
        'The nucleus contains protons and neutrons at the centre of an atom.', 7, [
          { text: 'Electron', isCorrect: false },
          { text: 'Nucleus', isCorrect: true },
          { text: 'Proton', isCorrect: false },
          { text: 'Shell', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'Which planet is closest to the Sun?', 15, 800,
        'Mercury orbits closest to the Sun at an average distance of 58 million km.', 8, [
          { text: 'Venus', isCorrect: false },
          { text: 'Mercury', isCorrect: true },
          { text: 'Earth', isCorrect: false },
          { text: 'Mars', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What force keeps us on the ground?', 15, 1000,
        'Gravity is the force of attraction between objects with mass.', 9, [
          { text: 'Friction', isCorrect: false },
          { text: 'Magnetism', isCorrect: false },
          { text: 'Gravity', isCorrect: true },
          { text: 'Tension', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What is the boiling point of water in °C?', 15, 800,
        'Water boils at 100°C (212°F) at standard atmospheric pressure.', 10, [
          { text: '90°C', isCorrect: false },
          { text: '100°C', isCorrect: true },
          { text: '110°C', isCorrect: false },
          { text: '80°C', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What organ pumps blood through the body?', 15, 1000,
        'The heart pumps about 5 litres of blood per minute through the circulatory system.', 11, [
          { text: 'Lungs', isCorrect: false },
          { text: 'Heart', isCorrect: true },
          { text: 'Liver', isCorrect: false },
          { text: 'Brain', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What is the study of living things called?', 15, 800,
        'Biology comes from Greek: bios (life) and logos (study).', 12, [
          { text: 'Chemistry', isCorrect: false },
          { text: 'Physics', isCorrect: false },
          { text: 'Biology', isCorrect: true },
          { text: 'Geology', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'Which vitamin is found in citrus fruits?', 15, 800,
        'Oranges, lemons, and grapefruits are rich in Vitamin C (ascorbic acid).', 13, [
          { text: 'Vitamin A', isCorrect: false },
          { text: 'Vitamin B', isCorrect: false },
          { text: 'Vitamin C', isCorrect: true },
          { text: 'Vitamin D', isCorrect: false },
        ]);
      addQ(sci, 'multiple-choice', 'What state of matter has a definite shape and volume?', 15, 1000,
        'Solids have a fixed shape and volume because their particles are tightly packed.', 14, [
          { text: 'Liquid', isCorrect: false },
          { text: 'Gas', isCorrect: false },
          { text: 'Solid', isCorrect: true },
          { text: 'Plasma', isCorrect: false },
        ]);
    }

    // ─── TRUE OR FALSE CHALLENGE (currently 5, add 10 starting at 5) ───
    const tfc = getQuizId('True or False Challenge');
    if (tfc) {
      addQ(tfc, 'true-false', 'Humans use only 10% of their brains.', 15, 800,
        'This is a myth. Brain scans show that we use virtually all parts of the brain.', 5, [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
        ]);
      addQ(tfc, 'true-false', 'Honey never spoils.', 15, 1000,
        'Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible. Its low moisture and acidity prevent bacterial growth.', 6, [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]);
      addQ(tfc, 'true-false', 'The Earth is the third planet from the Sun.', 15, 800,
        'The order is: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.', 7, [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]);
      addQ(tfc, 'true-false', 'Goldfish have a 3-second memory.', 15, 1000,
        'Goldfish can actually remember things for months. Studies have trained them to respond to stimuli over long periods.', 8, [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
        ]);
      addQ(tfc, 'true-false', 'Mount Everest is getting taller each year.', 20, 1000,
        'Due to tectonic plate movement, Everest grows about 4mm per year.', 9, [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]);
      addQ(tfc, 'true-false', 'An ostrich\'s eye is bigger than its brain.', 15, 1000,
        'An ostrich\'s eye is about 5cm in diameter, larger than its brain.', 10, [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]);
      addQ(tfc, 'true-false', 'Venus is the hottest planet in the solar system.', 15, 1000,
        'Despite being farther from the Sun than Mercury, Venus\'s thick CO₂ atmosphere traps heat, making its surface about 465°C.', 11, [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]);
      addQ(tfc, 'true-false', 'Bats are blind.', 15, 800,
        'Bats can see. Many species have good vision, and they also use echolocation for navigation in the dark.', 12, [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
        ]);
      addQ(tfc, 'true-false', 'The Amazon is the longest river in the world.', 15, 1000,
        'The Nile is generally considered the longest river at about 6,650 km. The Amazon is the largest by water volume.', 13, [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
        ]);
      addQ(tfc, 'true-false', 'Human nails and hair continue to grow after death.', 15, 800,
        'This is a myth. After death, the skin dehydrates and retracts, making nails and hair appear longer.', 14, [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
        ]);
    }

    // ─── BASIC ARITHMETIC (currently 6, add 9 starting at 6) ───
    const arith = getQuizId('Basic Arithmetic');
    if (arith) {
      addQ(arith, 'multiple-choice', 'What is 17 × 13?', 20, 1000,
        '17 × 13 = 221.', 6, [
          { text: '201', isCorrect: false },
          { text: '221', isCorrect: true },
          { text: '231', isCorrect: false },
          { text: '211', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 1000 ÷ 8?', 20, 1000,
        '1000 ÷ 8 = 125.', 7, [
          { text: '120', isCorrect: false },
          { text: '125', isCorrect: true },
          { text: '130', isCorrect: false },
          { text: '115', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 345 + 678?', 20, 1000,
        '345 + 678 = 1023.', 8, [
          { text: '1013', isCorrect: false },
          { text: '1023', isCorrect: true },
          { text: '1033', isCorrect: false },
          { text: '1003', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 50 × 50?', 15, 800,
        '50 × 50 = 2500.', 9, [
          { text: '2000', isCorrect: false },
          { text: '2500', isCorrect: true },
          { text: '2550', isCorrect: false },
          { text: '3000', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 999 − 456?', 20, 1000,
        '999 − 456 = 543.', 10, [
          { text: '553', isCorrect: false },
          { text: '533', isCorrect: false },
          { text: '543', isCorrect: true },
          { text: '563', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 12 × 11?', 15, 800,
        '12 × 11 = 132.', 11, [
          { text: '122', isCorrect: false },
          { text: '132', isCorrect: true },
          { text: '142', isCorrect: false },
          { text: '121', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is the cube of 3?', 15, 1000,
        '3³ = 3 × 3 × 3 = 27.', 12, [
          { text: '9', isCorrect: false },
          { text: '27', isCorrect: true },
          { text: '18', isCorrect: false },
          { text: '81', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 2⁵?', 15, 1000,
        '2⁵ = 2 × 2 × 2 × 2 × 2 = 32.', 13, [
          { text: '16', isCorrect: false },
          { text: '32', isCorrect: true },
          { text: '64', isCorrect: false },
          { text: '10', isCorrect: false },
        ]);
      addQ(arith, 'multiple-choice', 'What is 400 ÷ 16?', 20, 1000,
        '400 ÷ 16 = 25.', 14, [
          { text: '20', isCorrect: false },
          { text: '25', isCorrect: true },
          { text: '30', isCorrect: false },
          { text: '24', isCorrect: false },
        ]);
    }

    // ─── FRACTIONS & PERCENTAGES (currently 6, add 9 starting at 6) ───
    const frac = getQuizId('Fractions & Percentages');
    if (frac) {
      addQ(frac, 'multiple-choice', 'What is ⅔ + ⅓?', 15, 800,
        '⅔ + ⅓ = 3/3 = 1.', 6, [
          { text: '⅔', isCorrect: false },
          { text: '1', isCorrect: true },
          { text: '⅓', isCorrect: false },
          { text: '2', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'What is 40% of 250?', 20, 1000,
        '40% of 250 = 0.4 × 250 = 100.', 7, [
          { text: '80', isCorrect: false },
          { text: '100', isCorrect: true },
          { text: '120', isCorrect: false },
          { text: '90', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'Convert ⅖ to a decimal.', 20, 1000,
        '2 ÷ 5 = 0.4.', 8, [
          { text: '0.25', isCorrect: false },
          { text: '0.4', isCorrect: true },
          { text: '0.5', isCorrect: false },
          { text: '0.45', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'What is 15% of 80?', 15, 1000,
        '15% of 80 = 0.15 × 80 = 12.', 9, [
          { text: '10', isCorrect: false },
          { text: '12', isCorrect: true },
          { text: '15', isCorrect: false },
          { text: '8', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'What is ⅞ − ¼?', 25, 1200,
        '⅞ − ¼ = ⅞ − 2/8 = ⅝.', 10, [
          { text: '¾', isCorrect: false },
          { text: '⅝', isCorrect: true },
          { text: '½', isCorrect: false },
          { text: '⅜', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'What fraction is equivalent to 0.2?', 15, 800,
        '0.2 = 2/10 = ⅕.', 11, [
          { text: '½', isCorrect: false },
          { text: '⅕', isCorrect: true },
          { text: '¼', isCorrect: false },
          { text: '⅓', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'What is 75% as a fraction?', 15, 800,
        '75% = 75/100 = ¾.', 12, [
          { text: '⅔', isCorrect: false },
          { text: '¾', isCorrect: true },
          { text: '⅘', isCorrect: false },
          { text: '½', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'What is ½ × ⅔?', 20, 1000,
        '½ × ⅔ = 2/6 = ⅓.', 13, [
          { text: '⅓', isCorrect: true },
          { text: '¼', isCorrect: false },
          { text: '⅔', isCorrect: false },
          { text: '½', isCorrect: false },
        ]);
      addQ(frac, 'multiple-choice', 'If a shirt costs ₦2000 and is 20% off, what is the sale price?', 25, 1200,
        '20% of ₦2000 = ₦400. Sale price = ₦2000 − ₦400 = ₦1600.', 14, [
          { text: '₦1500', isCorrect: false },
          { text: '₦1600', isCorrect: true },
          { text: '₦1800', isCorrect: false },
          { text: '₦1400', isCorrect: false },
        ]);
    }

    // ─── GEOMETRY BASICS (currently 6, add 9 starting at 6) ───
    const geo = getQuizId('Geometry Basics');
    if (geo) {
      addQ(geo, 'multiple-choice', 'What is the area of a triangle with base 10 and height 6?', 20, 1000,
        'Area = ½ × base × height = ½ × 10 × 6 = 30.', 6, [
          { text: '60', isCorrect: false },
          { text: '30', isCorrect: true },
          { text: '16', isCorrect: false },
          { text: '36', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'How many degrees in a straight line?', 15, 800,
        'A straight angle measures exactly 180°.', 7, [
          { text: '90°', isCorrect: false },
          { text: '180°', isCorrect: true },
          { text: '270°', isCorrect: false },
          { text: '360°', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'What is a polygon with 5 sides called?', 15, 800,
        'A five-sided polygon is called a pentagon.', 8, [
          { text: 'Hexagon', isCorrect: false },
          { text: 'Pentagon', isCorrect: true },
          { text: 'Octagon', isCorrect: false },
          { text: 'Heptagon', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'What is the volume of a cube with side 3 cm?', 20, 1000,
        'Volume = side³ = 3³ = 27 cm³.', 9, [
          { text: '9 cm³', isCorrect: false },
          { text: '27 cm³', isCorrect: true },
          { text: '18 cm³', isCorrect: false },
          { text: '12 cm³', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'What type of triangle has all sides equal?', 15, 800,
        'An equilateral triangle has 3 equal sides and 3 equal angles (each 60°).', 10, [
          { text: 'Isosceles', isCorrect: false },
          { text: 'Equilateral', isCorrect: true },
          { text: 'Scalene', isCorrect: false },
          { text: 'Right-angled', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'How many faces does a cube have?', 15, 800,
        'A cube has 6 square faces, 12 edges, and 8 vertices.', 11, [
          { text: '4', isCorrect: false },
          { text: '6', isCorrect: true },
          { text: '8', isCorrect: false },
          { text: '12', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'What is the perimeter of a square with side 7?', 15, 1000,
        'Perimeter = 4 × side = 4 × 7 = 28.', 12, [
          { text: '21', isCorrect: false },
          { text: '28', isCorrect: true },
          { text: '49', isCorrect: false },
          { text: '14', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'What is a 4-sided polygon called?', 15, 800,
        'A quadrilateral is any polygon with 4 sides. Squares and rectangles are examples.', 13, [
          { text: 'Triangle', isCorrect: false },
          { text: 'Quadrilateral', isCorrect: true },
          { text: 'Pentagon', isCorrect: false },
          { text: 'Hexagon', isCorrect: false },
        ]);
      addQ(geo, 'multiple-choice', 'What is the name of a 3D shape like a ball?', 15, 800,
        'A sphere is a perfectly round 3D shape where every point on its surface is equidistant from the centre.', 14, [
          { text: 'Circle', isCorrect: false },
          { text: 'Sphere', isCorrect: true },
          { text: 'Cylinder', isCorrect: false },
          { text: 'Oval', isCorrect: false },
        ]);
    }

    // ─── ALGEBRA FOUNDATIONS (currently 6, add 9 starting at 6) ───
    const alg = getQuizId('Algebra Foundations');
    if (alg) {
      addQ(alg, 'multiple-choice', 'If 5x = 35, what is x?', 15, 800,
        'x = 35 ÷ 5 = 7.', 6, [
          { text: '5', isCorrect: false },
          { text: '7', isCorrect: true },
          { text: '8', isCorrect: false },
          { text: '30', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'Simplify: 4x + 3x', 15, 800,
        'Combine like terms: 4x + 3x = 7x.', 7, [
          { text: '7x', isCorrect: true },
          { text: '12x', isCorrect: false },
          { text: '7x²', isCorrect: false },
          { text: '43x', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'What is the value of 2x + 5 when x = 3?', 20, 1000,
        '2(3) + 5 = 6 + 5 = 11.', 8, [
          { text: '10', isCorrect: false },
          { text: '11', isCorrect: true },
          { text: '8', isCorrect: false },
          { text: '13', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'Solve: x/4 = 8', 15, 1000,
        'x = 8 × 4 = 32.', 9, [
          { text: '2', isCorrect: false },
          { text: '32', isCorrect: true },
          { text: '12', isCorrect: false },
          { text: '24', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'What is 5(x − 2) expanded?', 20, 1000,
        'Distribute: 5 × x − 5 × 2 = 5x − 10.', 10, [
          { text: '5x − 2', isCorrect: false },
          { text: '5x − 10', isCorrect: true },
          { text: '5x + 10', isCorrect: false },
          { text: 'x − 10', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'If x + y = 10 and x = 4, what is y?', 15, 800,
        'y = 10 − 4 = 6.', 11, [
          { text: '4', isCorrect: false },
          { text: '6', isCorrect: true },
          { text: '10', isCorrect: false },
          { text: '14', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'What is x when 2x + 6 = 20?', 20, 1000,
        '2x = 20 − 6 = 14, so x = 7.', 12, [
          { text: '7', isCorrect: true },
          { text: '10', isCorrect: false },
          { text: '14', isCorrect: false },
          { text: '13', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'Simplify: 3(2x + 1) − x', 25, 1200,
        '3(2x + 1) − x = 6x + 3 − x = 5x + 3.', 13, [
          { text: '5x + 3', isCorrect: true },
          { text: '6x + 3', isCorrect: false },
          { text: '5x + 1', isCorrect: false },
          { text: '7x + 3', isCorrect: false },
        ]);
      addQ(alg, 'multiple-choice', 'What is the value of x² + 2x when x = 3?', 20, 1000,
        '3² + 2(3) = 9 + 6 = 15.', 14, [
          { text: '12', isCorrect: false },
          { text: '15', isCorrect: true },
          { text: '18', isCorrect: false },
          { text: '11', isCorrect: false },
        ]);
    }
  });

  seedAll();
  console.log('Upgraded 7 quizzes with 66 additional questions.');
}
