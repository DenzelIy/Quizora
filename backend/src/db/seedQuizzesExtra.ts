import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedExtraQuizzes() {
  const db = getDb();

  const marker = db.prepare("SELECT COUNT(*) as count FROM quizzes WHERE category = 'Mathematics'").get() as { count: number };
  // Once seeded, the definitions below are only used to repair questions saved by the old, broken mc() helper.
  const repairOnly = marker.count > 0;
  let repairedCount = 0;

  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (id, title, description, category) VALUES (?, ?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO questions (id, quiz_id, type, text, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );

  const addQuiz = (title: string, description: string, category: string): string | null => {
    if (repairOnly) {
      const existing = db.prepare('SELECT id FROM quizzes WHERE title = ? AND category = ?').get(title, category) as { id: string } | undefined;
      return existing?.id ?? null;
    }
    const id = randomUUID();
    insertQuiz.run(id, title, description, category);
    return id;
  };

  // The old mc() dropped the real answer and marked the first wrong answer correct. Fix questions still in
  // exactly that state (the stored answers are the full set minus the real answer); edited questions are left alone.
  const repairAnswers = (quizId: string, text: string, answers: { text: string; isCorrect: boolean }[]) => {
    const question = db.prepare('SELECT id FROM questions WHERE quiz_id = ? AND text = ?').get(quizId, text) as { id: string } | undefined;
    if (!question) return;

    const correct = answers.find((a) => a.isCorrect)!.text;
    const stored = db.prepare('SELECT id, text FROM answer_options WHERE question_id = ?').all(question.id) as { id: string; text: string }[];
    const allTexts = new Set(answers.map((a) => a.text));
    const isBroken =
      stored.length === answers.length - 1 &&
      !stored.some((a) => a.text === correct) &&
      stored.every((a) => allTexts.has(a.text));
    if (!isBroken) return;

    db.prepare('UPDATE answer_options SET is_correct = 0 WHERE question_id = ?').run(question.id);
    insertAnswer.run(randomUUID(), question.id, correct, 1, 0);
    // Reorder all options to the freshly shuffled order so the real answer isn't always in the same spot.
    const updateOrder = db.prepare('UPDATE answer_options SET order_index = ? WHERE question_id = ? AND text = ?');
    answers.forEach((a, i) => updateOrder.run(i, question.id, a.text));
    repairedCount++;
  };

  const addQ = (
    quizId: string | null,
    type: string,
    text: string,
    timeLimit: number,
    points: number,
    explanation: string,
    orderIndex: number,
    answers: { text: string; isCorrect: boolean }[]
  ) => {
    if (repairOnly) {
      if (quizId && type === 'multiple-choice') repairAnswers(quizId, text, answers);
      return;
    }
    if (!quizId) return;
    const id = randomUUID();
    insertQuestion.run(id, quizId, type, text, timeLimit, points, explanation, orderIndex);
    answers.forEach((a, i) => {
      insertAnswer.run(randomUUID(), id, a.text, a.isCorrect ? 1 : 0, i);
    });
  };

  // First argument is the correct answer, the rest are wrong.
  const mc = (correct: string, ...wrong: string[]): { text: string; isCorrect: boolean }[] =>
    shuffle([
      { text: correct, isCorrect: true },
      ...wrong.map((w) => ({ text: w, isCorrect: false })),
    ]);

  const tf = (correct: boolean): { text: string; isCorrect: boolean }[] => [
    { text: 'True', isCorrect: correct },
    { text: 'False', isCorrect: !correct },
  ];

  const seedAll = db.transaction(() => {
    // ─── MATHEMATICS ───
    const math1 = addQuiz('Basic Arithmetic', 'Addition, subtraction, multiplication and division fundamentals.', 'Mathematics');
    addQ(math1, 'multiple-choice', 'What is 15 × 12?', 20, 1000, '15 × 12 = 180.', 0, mc('180', '160', '190', '170'));
    addQ(math1, 'multiple-choice', 'What is 144 ÷ 12?', 20, 1000, '144 ÷ 12 = 12.', 1, mc('12', '14', '11', '13'));
    addQ(math1, 'multiple-choice', 'What is 256 + 389?', 20, 1000, '256 + 389 = 645.', 2, mc('645', '635', '655', '625'));
    addQ(math1, 'multiple-choice', 'What is 1000 − 473?', 20, 1000, '1000 − 473 = 527.', 3, mc('527', '537', '517', '547'));
    addQ(math1, 'multiple-choice', 'What is 25 × 25?', 25, 1000, '25² = 625.', 4, mc('625', '525', '675', '600'));
    addQ(math1, 'multiple-choice', 'What is the square root of 81?', 15, 800, '√81 = 9.', 5, mc('9', '8', '7', '11'));

    const math2 = addQuiz('Fractions & Percentages', 'Work with fractions, decimals and percentages.', 'Mathematics');
    addQ(math2, 'multiple-choice', 'What is ½ + ¼?', 20, 1000, '½ + ¼ = ¾.', 0, mc('¾', '½', '⅔', '1'));
    addQ(math2, 'multiple-choice', 'What is 25% of 200?', 15, 800, '25% of 200 = 50.', 1, mc('50', '25', '75', '40'));
    addQ(math2, 'multiple-choice', 'Convert 0.75 to a fraction.', 20, 1000, '0.75 = ¾.', 2, mc('¾', '⅔', '⅘', '½'));
    addQ(math2, 'multiple-choice', 'What is 3/5 as a percentage?', 20, 1000, '3/5 = 60%.', 3, mc('60%', '50%', '65%', '55%'));
    addQ(math2, 'multiple-choice', 'What is ⅓ of 90?', 15, 800, '90 ÷ 3 = 30.', 4, mc('30', '27', '33', '25'));
    addQ(math2, 'true-false', '0.5 is the same as 50%.', 10, 800, '0.5 = 50/100 = 50%.', 5, tf(true));

    const math3 = addQuiz('Geometry Basics', 'Shapes, angles, and measurements.', 'Mathematics');
    addQ(math3, 'multiple-choice', 'How many sides does a hexagon have?', 15, 800, 'A hexagon has 6 sides.', 0, mc('6', '5', '7', '8'));
    addQ(math3, 'multiple-choice', 'What is the sum of angles in a triangle?', 15, 1000, 'The sum of interior angles of a triangle is always 180°.', 1, mc('180°', '90°', '360°', '270°'));
    addQ(math3, 'multiple-choice', 'What is the area of a rectangle with length 8 and width 5?', 20, 1000, 'Area = length × width = 8 × 5 = 40.', 2, mc('40', '26', '35', '45'));
    addQ(math3, 'multiple-choice', 'What type of angle is exactly 90°?', 10, 800, 'A 90° angle is called a right angle.', 3, mc('Right angle', 'Acute angle', 'Obtuse angle', 'Straight angle'));
    addQ(math3, 'multiple-choice', 'What is the circumference formula for a circle?', 20, 1000, 'Circumference = 2πr or πd.', 4, mc('2πr', 'πr²', '2r²', 'πr'));
    addQ(math3, 'true-false', 'A square is also a rectangle.', 10, 800, 'A square meets all requirements of a rectangle (4 right angles, opposite sides equal).', 5, tf(true));

    // ─── ENGLISH LANGUAGE ───
    const eng1 = addQuiz('Parts of Speech', 'Nouns, verbs, adjectives and more.', 'English');
    addQ(eng1, 'multiple-choice', 'Which word is a noun in: "The cat sat on the mat"?', 15, 800, '"Cat" and "mat" are nouns — they name things.', 0, mc('cat', 'sat', 'on', 'the'));
    addQ(eng1, 'multiple-choice', 'What is an adjective?', 15, 800, 'An adjective is a word that describes a noun.', 1, mc('A word that describes a noun', 'A word that shows action', 'A word that joins sentences', 'A word that replaces a noun'));
    addQ(eng1, 'multiple-choice', 'Which is the verb in: "She quickly ran home"?', 15, 1000, '"Ran" is the verb — it shows the action.', 2, mc('ran', 'quickly', 'She', 'home'));
    addQ(eng1, 'multiple-choice', 'What is the plural of "child"?', 10, 800, '"Child" has an irregular plural: "children".', 3, mc('children', 'childs', 'childes', 'childern'));
    addQ(eng1, 'multiple-choice', 'Which sentence uses correct punctuation?', 20, 1000, 'A question ends with a question mark.', 4, mc('Where are you going?', 'Where are you going.', 'Where are you going,', 'Where are you going!'));
    addQ(eng1, 'true-false', '"Quickly" is an adverb.', 10, 800, 'Adverbs modify verbs, adjectives, or other adverbs. "Quickly" describes how an action is done.', 5, tf(true));

    const eng2 = addQuiz('Vocabulary Builder', 'Expand your word knowledge!', 'English');
    addQ(eng2, 'multiple-choice', 'What does "benevolent" mean?', 20, 1000, 'Benevolent means well-meaning and kindly.', 0, mc('Kind and generous', 'Angry and hostile', 'Quiet and shy', 'Clever and quick'));
    addQ(eng2, 'multiple-choice', 'Which word is a synonym for "happy"?', 15, 800, 'Joyful means feeling great happiness.', 1, mc('Joyful', 'Sorrowful', 'Anxious', 'Weary'));
    addQ(eng2, 'multiple-choice', 'What is the antonym of "ancient"?', 15, 800, 'Modern is the opposite of ancient.', 2, mc('Modern', 'Old', 'Historic', 'Antique'));
    addQ(eng2, 'multiple-choice', 'What does "transparent" mean?', 15, 1000, 'Transparent means allowing light to pass through so objects behind can be seen.', 3, mc('See-through', 'Colourful', 'Heavy', 'Dark'));
    addQ(eng2, 'multiple-choice', '"She was as brave as a lion." This is an example of?', 20, 1000, 'A simile compares two things using "as" or "like".', 4, mc('Simile', 'Metaphor', 'Alliteration', 'Personification'));
    addQ(eng2, 'multiple-choice', 'What does the prefix "un-" mean?', 15, 800, 'The prefix "un-" means not or the opposite of.', 5, mc('Not / opposite', 'Again', 'Before', 'Under'));

    // ─── NIGERIAN HISTORY ───
    const nh1 = addQuiz('Nigerian Independence', 'Key events in Nigeria\'s journey to independence.', 'History');
    addQ(nh1, 'multiple-choice', 'When did Nigeria gain independence from Britain?', 15, 1000, 'Nigeria became independent on 1 October 1960.', 0, mc('1960', '1957', '1963', '1955'));
    addQ(nh1, 'multiple-choice', 'Who was Nigeria\'s first Prime Minister?', 20, 1000, 'Sir Abubakar Tafawa Balewa was the first and only Prime Minister of Nigeria.', 1, mc('Tafawa Balewa', 'Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello'));
    addQ(nh1, 'multiple-choice', 'Who was the first President of Nigeria?', 20, 1000, 'Nnamdi Azikiwe served as the first President from 1963 to 1966.', 2, mc('Nnamdi Azikiwe', 'Tafawa Balewa', 'Obafemi Awolowo', 'Yakubu Gowon'));
    addQ(nh1, 'multiple-choice', 'What year did Nigeria become a republic?', 20, 1000, 'Nigeria became a republic on 1 October 1963.', 3, mc('1963', '1960', '1966', '1970'));
    addQ(nh1, 'multiple-choice', 'Which city is the current capital of Nigeria?', 10, 800, 'Abuja became the capital in 1991, replacing Lagos.', 4, mc('Abuja', 'Lagos', 'Ibadan', 'Kano'));
    addQ(nh1, 'true-false', 'Lagos was once the capital of Nigeria.', 10, 800, 'Lagos served as the capital until 12 December 1991 when Abuja took over.', 5, tf(true));

    const nh2 = addQuiz('Nigerian Culture & People', 'Ethnic groups, languages, and traditions.', 'History');
    addQ(nh2, 'multiple-choice', 'How many states does Nigeria have?', 15, 1000, 'Nigeria has 36 states plus the Federal Capital Territory (Abuja).', 0, mc('36', '24', '48', '30'));
    addQ(nh2, 'multiple-choice', 'Which are the three largest ethnic groups in Nigeria?', 20, 1200, 'Hausa, Yoruba, and Igbo are the three largest ethnic groups.', 1, mc('Hausa, Yoruba, Igbo', 'Ijaw, Tiv, Kanuri', 'Fulani, Edo, Efik', 'Igbo, Nupe, Ibibio'));
    addQ(nh2, 'multiple-choice', 'What is the official language of Nigeria?', 10, 800, 'English is the official language, a legacy of British colonial rule.', 2, mc('English', 'Hausa', 'Yoruba', 'Igbo'));
    addQ(nh2, 'multiple-choice', 'Which Nigerian city is known as the "Centre of Commerce"?', 20, 1000, 'Lagos is Nigeria\'s economic hub and largest city.', 3, mc('Lagos', 'Abuja', 'Kano', 'Port Harcourt'));
    addQ(nh2, 'multiple-choice', 'What is Nigeria\'s currency?', 10, 800, 'The Naira (₦) has been Nigeria\'s currency since 1973.', 4, mc('Naira', 'Cedi', 'Shilling', 'Rand'));
    addQ(nh2, 'true-false', 'Nigeria is the most populous country in Africa.', 10, 800, 'With over 200 million people, Nigeria is the most populous country in Africa.', 5, tf(true));

    // ─── AFRICAN GEOGRAPHY ───
    const geo1 = addQuiz('African Geography', 'Rivers, mountains, and landmarks of Africa.', 'Geography');
    addQ(geo1, 'multiple-choice', 'What is the longest river in Africa?', 15, 1000, 'The Nile is approximately 6,650 km long.', 0, mc('Nile', 'Congo', 'Niger', 'Zambezi'));
    addQ(geo1, 'multiple-choice', 'What is the largest desert in Africa?', 15, 1000, 'The Sahara is the largest hot desert in the world, covering about 9.2 million km².', 1, mc('Sahara', 'Kalahari', 'Namib', 'Libyan'));
    addQ(geo1, 'multiple-choice', 'Mount Kilimanjaro is located in which country?', 15, 1000, 'Mount Kilimanjaro is in Tanzania, near the Kenyan border.', 2, mc('Tanzania', 'Kenya', 'Ethiopia', 'Uganda'));
    addQ(geo1, 'multiple-choice', 'Which is the largest country in Africa by area?', 20, 1000, 'Algeria is the largest African country by area at about 2.38 million km².', 3, mc('Algeria', 'Sudan', 'Nigeria', 'Libya'));
    addQ(geo1, 'multiple-choice', 'Lake Victoria borders which three countries?', 25, 1200, 'Lake Victoria borders Kenya, Tanzania, and Uganda.', 4, mc('Kenya, Tanzania, Uganda', 'Nigeria, Niger, Chad', 'Egypt, Sudan, Ethiopia', 'Malawi, Mozambique, Tanzania'));
    addQ(geo1, 'multiple-choice', 'What ocean lies to the west of Africa?', 10, 800, 'The Atlantic Ocean borders Africa to the west.', 5, mc('Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Southern Ocean'));

    // ─── WORLD GEOGRAPHY ───
    const geo2 = addQuiz('World Geography', 'Countries, capitals, and continents.', 'Geography');
    addQ(geo2, 'multiple-choice', 'What is the smallest country in the world?', 15, 1000, 'Vatican City is approximately 0.44 km².', 0, mc('Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'));
    addQ(geo2, 'multiple-choice', 'Which river flows through London?', 15, 800, 'The River Thames flows through London.', 1, mc('Thames', 'Seine', 'Danube', 'Rhine'));
    addQ(geo2, 'multiple-choice', 'What is the capital of Japan?', 10, 800, 'Tokyo has been the capital of Japan since 1868.', 2, mc('Tokyo', 'Osaka', 'Kyoto', 'Yokohama'));
    addQ(geo2, 'multiple-choice', 'Which continent has the most countries?', 20, 1000, 'Africa has 54 recognized countries.', 3, mc('Africa', 'Europe', 'Asia', 'South America'));
    addQ(geo2, 'multiple-choice', 'What is the largest country by area?', 15, 1000, 'Russia spans about 17.1 million km² across Europe and Asia.', 4, mc('Russia', 'Canada', 'China', 'United States'));
    addQ(geo2, 'true-false', 'Australia is both a country and a continent.', 10, 800, 'Australia is the world\'s smallest continent and the only one that is also a country.', 5, tf(true));

    // ─── BIOLOGY ───
    const bio1 = addQuiz('Human Biology', 'The human body and how it works.', 'Science');
    addQ(bio1, 'multiple-choice', 'What is the largest organ in the human body?', 15, 1000, 'The skin is the largest organ, covering about 1.5–2 m².', 0, mc('Skin', 'Liver', 'Heart', 'Lungs'));
    addQ(bio1, 'multiple-choice', 'How many chambers does the human heart have?', 15, 800, 'The heart has 4 chambers: 2 atria and 2 ventricles.', 1, mc('4', '2', '3', '6'));
    addQ(bio1, 'multiple-choice', 'Which blood type is the universal donor?', 20, 1000, 'Type O-negative can be given to any blood type.', 2, mc('O-negative', 'A-positive', 'AB-positive', 'B-negative'));
    addQ(bio1, 'multiple-choice', 'What is the main function of red blood cells?', 15, 1000, 'Red blood cells carry oxygen from the lungs to the rest of the body.', 3, mc('Carry oxygen', 'Fight infection', 'Clot blood', 'Produce hormones'));
    addQ(bio1, 'multiple-choice', 'Which organ produces insulin?', 15, 1000, 'The pancreas produces insulin to regulate blood sugar levels.', 4, mc('Pancreas', 'Liver', 'Kidney', 'Stomach'));
    addQ(bio1, 'true-false', 'Humans have more than 600 muscles in their body.', 15, 800, 'The human body has over 600 skeletal muscles.', 5, tf(true));

    const bio2 = addQuiz('Plant Biology', 'How plants grow, reproduce, and survive.', 'Science');
    addQ(bio2, 'multiple-choice', 'What process do plants use to make food?', 15, 1000, 'Photosynthesis converts sunlight, water, and CO₂ into glucose and oxygen.', 0, mc('Photosynthesis', 'Respiration', 'Fermentation', 'Digestion'));
    addQ(bio2, 'multiple-choice', 'Which part of the plant absorbs water from the soil?', 10, 800, 'Roots absorb water and minerals from the soil.', 1, mc('Roots', 'Leaves', 'Stem', 'Flowers'));
    addQ(bio2, 'multiple-choice', 'What pigment gives plants their green colour?', 15, 1000, 'Chlorophyll absorbs red and blue light, reflecting green.', 2, mc('Chlorophyll', 'Carotene', 'Melanin', 'Anthocyanin'));
    addQ(bio2, 'multiple-choice', 'What gas do plants release during photosynthesis?', 10, 800, 'Plants release oxygen as a by-product of photosynthesis.', 3, mc('Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'));
    addQ(bio2, 'multiple-choice', 'What is the function of a flower in a plant?', 15, 1000, 'Flowers are the reproductive organs of flowering plants.', 4, mc('Reproduction', 'Photosynthesis', 'Water storage', 'Breathing'));
    addQ(bio2, 'true-false', 'Trees are the only plants that can photosynthesise.', 10, 800, 'All green plants (and algae) can photosynthesise, not just trees.', 5, tf(false));

    // ─── PHYSICS ───
    const phys1 = addQuiz('Forces and Motion', 'Newton\'s laws and basic mechanics.', 'Science');
    addQ(phys1, 'multiple-choice', 'What is the SI unit of force?', 15, 1000, 'The Newton (N) is the SI unit of force, named after Sir Isaac Newton.', 0, mc('Newton', 'Joule', 'Watt', 'Pascal'));
    addQ(phys1, 'multiple-choice', 'What does Newton\'s First Law state?', 25, 1200, 'An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.', 1, mc('Objects stay at rest or in motion unless acted upon by a force', 'Force equals mass times acceleration', 'Every action has an equal and opposite reaction', 'Energy cannot be created or destroyed'));
    addQ(phys1, 'multiple-choice', 'What is the acceleration due to gravity on Earth?', 15, 1000, 'The acceleration due to gravity is approximately 9.8 m/s².', 2, mc('9.8 m/s²', '6.7 m/s²', '10.5 m/s²', '8.2 m/s²'));
    addQ(phys1, 'multiple-choice', 'What force keeps planets in orbit around the Sun?', 15, 1000, 'Gravity keeps the planets in orbit.', 3, mc('Gravity', 'Magnetism', 'Friction', 'Centripetal'));
    addQ(phys1, 'multiple-choice', 'What is the formula for speed?', 15, 800, 'Speed = Distance ÷ Time.', 4, mc('Distance ÷ Time', 'Mass × Acceleration', 'Force × Distance', 'Time × Distance'));
    addQ(phys1, 'true-false', 'In a vacuum, a feather and a hammer fall at the same rate.', 15, 1000, 'Without air resistance, all objects fall at the same rate regardless of mass.', 5, tf(true));

    const phys2 = addQuiz('Energy and Electricity', 'Types of energy and electrical circuits.', 'Science');
    addQ(phys2, 'multiple-choice', 'What is the SI unit of electrical current?', 15, 1000, 'The Ampere (A) measures electrical current.', 0, mc('Ampere', 'Volt', 'Ohm', 'Watt'));
    addQ(phys2, 'multiple-choice', 'What does a resistor do in a circuit?', 20, 1000, 'A resistor limits the flow of electrical current.', 1, mc('Limits current flow', 'Stores energy', 'Generates current', 'Measures voltage'));
    addQ(phys2, 'multiple-choice', 'What type of energy does a battery store?', 15, 800, 'Batteries store chemical energy and convert it to electrical energy.', 2, mc('Chemical energy', 'Kinetic energy', 'Nuclear energy', 'Thermal energy'));
    addQ(phys2, 'multiple-choice', 'Which material is the best conductor of electricity?', 15, 1000, 'Silver is the best conductor, followed by copper and gold.', 3, mc('Silver', 'Rubber', 'Glass', 'Wood'));
    addQ(phys2, 'multiple-choice', 'What is Ohm\'s Law?', 20, 1200, 'Ohm\'s Law: V = IR (Voltage = Current × Resistance).', 4, mc('V = IR', 'F = ma', 'E = mc²', 'P = IV'));
    addQ(phys2, 'true-false', 'Water is always a good conductor of electricity.', 10, 800, 'Pure water is a poor conductor. It conducts well only when dissolved salts or minerals are present.', 5, tf(false));

    // ─── CHEMISTRY ───
    const chem1 = addQuiz('Elements & Periodic Table', 'Know your elements!', 'Science');
    addQ(chem1, 'multiple-choice', 'What is the chemical symbol for sodium?', 15, 1000, 'Na comes from the Latin word "natrium".', 0, mc('Na', 'So', 'Sd', 'S'));
    addQ(chem1, 'multiple-choice', 'What is the most abundant gas in Earth\'s atmosphere?', 15, 1000, 'Nitrogen makes up about 78% of the atmosphere.', 1, mc('Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'));
    addQ(chem1, 'multiple-choice', 'What is the chemical formula for water?', 10, 800, 'Water is two hydrogen atoms and one oxygen atom: H₂O.', 2, mc('H₂O', 'CO₂', 'NaCl', 'O₂'));
    addQ(chem1, 'multiple-choice', 'How many elements are in the periodic table?', 20, 1000, 'There are 118 confirmed elements as of 2024.', 3, mc('118', '92', '108', '126'));
    addQ(chem1, 'multiple-choice', 'What is the pH of pure water?', 15, 1000, 'Pure water has a neutral pH of 7.', 4, mc('7', '0', '14', '5'));
    addQ(chem1, 'true-false', 'Helium is a noble gas.', 10, 800, 'Helium is in Group 18 of the periodic table, the noble gases.', 5, tf(true));

    // ─── COMPUTER SCIENCE ───
    const cs1 = addQuiz('Computer Basics', 'Hardware, software, and fundamental concepts.', 'Technology');
    addQ(cs1, 'multiple-choice', 'What does CPU stand for?', 15, 1000, 'CPU = Central Processing Unit, the "brain" of the computer.', 0, mc('Central Processing Unit', 'Central Power Unit', 'Computer Personal Unit', 'Central Program Utility'));
    addQ(cs1, 'multiple-choice', 'What does RAM stand for?', 15, 1000, 'RAM = Random Access Memory, used for temporary data storage.', 1, mc('Random Access Memory', 'Read And Modify', 'Run All Memory', 'Random Allocated Memory'));
    addQ(cs1, 'multiple-choice', 'Which of these is an input device?', 10, 800, 'A keyboard is an input device — it sends data to the computer.', 2, mc('Keyboard', 'Monitor', 'Printer', 'Speaker'));
    addQ(cs1, 'multiple-choice', 'What is the binary system based on?', 15, 1000, 'Binary uses only two digits: 0 and 1.', 3, mc('2 digits (0 and 1)', '8 digits (0-7)', '10 digits (0-9)', '16 digits (0-F)'));
    addQ(cs1, 'multiple-choice', 'What does "HTTP" stand for?', 20, 1000, 'HTTP = HyperText Transfer Protocol, the foundation of web communication.', 4, mc('HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Transmission Process', 'Home Tool Transfer Protocol'));
    addQ(cs1, 'true-false', '1 kilobyte equals exactly 1000 bytes.', 15, 800, 'In common usage 1 KB = 1000 bytes (SI), but in computing a kibibyte (KiB) = 1024 bytes.', 5, tf(true));

    const cs2 = addQuiz('Internet & Digital Safety', 'Stay safe online and understand the web.', 'Technology');
    addQ(cs2, 'multiple-choice', 'What does URL stand for?', 15, 1000, 'URL = Uniform Resource Locator, the address of a web page.', 0, mc('Uniform Resource Locator', 'Universal Resource Link', 'Uniform Router Link', 'Universal Routing Locator'));
    addQ(cs2, 'multiple-choice', 'Which of these is a strong password practice?', 20, 1000, 'Using a mix of letters, numbers, and symbols creates a strong password.', 1, mc('Mix of letters, numbers, and symbols', 'Using your birthday', 'Using "password123"', 'Using only lowercase letters'));
    addQ(cs2, 'multiple-choice', 'What is phishing?', 20, 1200, 'Phishing is a scam where attackers pretend to be a trusted entity to steal information.', 2, mc('A scam to steal personal information', 'A type of computer virus', 'A method to speed up internet', 'A way to catch fish'));
    addQ(cs2, 'multiple-choice', 'What does the "S" in HTTPS mean?', 15, 1000, 'HTTPS = HyperText Transfer Protocol Secure — it encrypts data in transit.', 3, mc('Secure', 'Server', 'Simple', 'System'));
    addQ(cs2, 'multiple-choice', 'Which file extension typically indicates a virus risk?', 20, 1000, '.exe files can execute programs and are commonly used to spread malware.', 4, mc('.exe', '.jpg', '.pdf', '.txt'));
    addQ(cs2, 'true-false', 'Public Wi-Fi is always safe to use for banking.', 10, 800, 'Public Wi-Fi can be insecure. Avoid accessing sensitive accounts without a VPN.', 5, tf(false));

    // ─── CIVIC EDUCATION ───
    const civic1 = addQuiz('Nigerian Government', 'How Nigeria is governed.', 'Civic Education');
    addQ(civic1, 'multiple-choice', 'What system of government does Nigeria practise?', 15, 1000, 'Nigeria operates a presidential system of government.', 0, mc('Presidential', 'Parliamentary', 'Monarchical', 'Unitary'));
    addQ(civic1, 'multiple-choice', 'How many arms of government are there in Nigeria?', 10, 800, 'The 3 arms are Executive, Legislative, and Judicial.', 1, mc('3', '2', '4', '5'));
    addQ(civic1, 'multiple-choice', 'What is the name of Nigeria\'s parliament?', 15, 1000, 'Nigeria\'s parliament is the National Assembly, consisting of the Senate and House of Representatives.', 2, mc('National Assembly', 'Parliament House', 'Federal Congress', 'House of Chiefs'));
    addQ(civic1, 'multiple-choice', 'How many senators represent each state in Nigeria?', 15, 1000, 'Each of Nigeria\'s 36 states is represented by 3 senators.', 3, mc('3', '2', '4', '1'));
    addQ(civic1, 'multiple-choice', 'What is the minimum voting age in Nigeria?', 10, 800, 'Citizens aged 18 and above are eligible to vote in Nigeria.', 4, mc('18', '16', '21', '25'));
    addQ(civic1, 'true-false', 'Nigeria operates a federal system of government.', 10, 800, 'Nigeria is a federation of 36 states and the FCT.', 5, tf(true));

    // ─── LITERATURE ───
    const lit1 = addQuiz('African Literature', 'Great works of African authors.', 'Literature');
    addQ(lit1, 'multiple-choice', 'Who wrote "Things Fall Apart"?', 15, 1000, 'Chinua Achebe published Things Fall Apart in 1958.', 0, mc('Chinua Achebe', 'Wole Soyinka', 'Chimamanda Adichie', 'Ngugi wa Thiong\'o'));
    addQ(lit1, 'multiple-choice', 'Which Nigerian author won the Nobel Prize in Literature?', 20, 1200, 'Wole Soyinka won the Nobel Prize in Literature in 1986.', 1, mc('Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Cyprian Ekwensi'));
    addQ(lit1, 'multiple-choice', 'What is the setting of "Things Fall Apart"?', 20, 1000, 'The novel is set in pre-colonial Igbo communities in south-eastern Nigeria.', 2, mc('Pre-colonial Igbo community', 'Colonial Lagos', 'Modern-day Abuja', 'Ancient Benin Kingdom'));
    addQ(lit1, 'multiple-choice', 'Who wrote "Purple Hibiscus"?', 15, 1000, 'Chimamanda Ngozi Adichie published Purple Hibiscus in 2003.', 3, mc('Chimamanda Adichie', 'Buchi Emecheta', 'Flora Nwapa', 'Sefi Atta'));
    addQ(lit1, 'multiple-choice', 'Who is the main character in "Things Fall Apart"?', 15, 1000, 'Okonkwo is the protagonist of the novel.', 4, mc('Okonkwo', 'Obierika', 'Ikemefuna', 'Nwoye'));
    addQ(lit1, 'true-false', 'Wole Soyinka is also known as a playwright.', 10, 800, 'Soyinka is a poet, playwright, novelist, and essayist.', 5, tf(true));

    // ─── SPORTS ───
    const sport1 = addQuiz('Sports Trivia', 'Football, athletics, and more!', 'Sports');
    addQ(sport1, 'multiple-choice', 'How many players are on a football (soccer) team on the pitch?', 10, 800, 'Each team has 11 players on the field.', 0, mc('11', '9', '10', '12'));
    addQ(sport1, 'multiple-choice', 'Which country hosted the first FIFA World Cup?', 20, 1000, 'Uruguay hosted and won the first World Cup in 1930.', 1, mc('Uruguay', 'Brazil', 'England', 'France'));
    addQ(sport1, 'multiple-choice', 'What is the nickname of the Nigerian national football team?', 10, 800, 'The Super Eagles is the nickname of the Nigerian men\'s national team.', 2, mc('Super Eagles', 'Black Stars', 'Indomitable Lions', 'Bafana Bafana'));
    addQ(sport1, 'multiple-choice', 'In which sport is a "slam dunk" performed?', 10, 800, 'A slam dunk is a type of shot in basketball.', 3, mc('Basketball', 'Volleyball', 'Tennis', 'Football'));
    addQ(sport1, 'multiple-choice', 'How long is a standard Olympic swimming pool?', 15, 1000, 'An Olympic swimming pool is 50 metres long.', 4, mc('50 metres', '25 metres', '100 metres', '75 metres'));
    addQ(sport1, 'true-false', 'The Olympics are held every 4 years.', 10, 800, 'The Summer and Winter Olympics each occur every 4 years, alternating every 2 years.', 5, tf(true));

    // ─── CURRENT AFFAIRS / GENERAL ───
    const gen1 = addQuiz('Animal Kingdom', 'Fun facts about animals!', 'General');
    addQ(gen1, 'multiple-choice', 'What is the fastest land animal?', 15, 1000, 'The cheetah can reach speeds up to 112 km/h.', 0, mc('Cheetah', 'Lion', 'Horse', 'Gazelle'));
    addQ(gen1, 'multiple-choice', 'What is the largest mammal on Earth?', 15, 1000, 'The blue whale can grow up to 30 metres long and weigh 200 tonnes.', 1, mc('Blue whale', 'African elephant', 'Giraffe', 'Hippopotamus'));
    addQ(gen1, 'multiple-choice', 'How many legs does a spider have?', 10, 800, 'Spiders are arachnids and always have 8 legs.', 2, mc('8', '6', '10', '12'));
    addQ(gen1, 'multiple-choice', 'Which bird is the largest in the world?', 15, 1000, 'The ostrich is the largest living bird and cannot fly.', 3, mc('Ostrich', 'Eagle', 'Penguin', 'Emu'));
    addQ(gen1, 'multiple-choice', 'What is a group of lions called?', 10, 800, 'A group of lions is called a pride.', 4, mc('Pride', 'Pack', 'Herd', 'Flock'));
    addQ(gen1, 'true-false', 'Dolphins are fish.', 10, 800, 'Dolphins are mammals — they breathe air, give live birth, and nurse their young.', 5, tf(false));

    const gen2 = addQuiz('Space & Astronomy', 'Explore our solar system and beyond!', 'Science');
    addQ(gen2, 'multiple-choice', 'What is the largest planet in our solar system?', 15, 1000, 'Jupiter is the largest planet, with a diameter of about 139,820 km.', 0, mc('Jupiter', 'Saturn', 'Neptune', 'Uranus'));
    addQ(gen2, 'multiple-choice', 'How many planets are in our solar system?', 10, 800, 'There are 8 planets since Pluto was reclassified in 2006.', 1, mc('8', '9', '7', '10'));
    addQ(gen2, 'multiple-choice', 'What is the closest star to Earth?', 15, 1000, 'The Sun is the closest star, about 150 million km away.', 2, mc('The Sun', 'Proxima Centauri', 'Sirius', 'Alpha Centauri'));
    addQ(gen2, 'multiple-choice', 'What planet is known for its rings?', 10, 800, 'Saturn is famous for its prominent ring system.', 3, mc('Saturn', 'Jupiter', 'Uranus', 'Neptune'));
    addQ(gen2, 'multiple-choice', 'What was the first animal sent into space?', 20, 1200, 'Fruit flies were the first animals launched into space in 1947. Laika the dog went in 1957.', 4, mc('Fruit flies', 'Dog (Laika)', 'Monkey', 'Cat'));
    addQ(gen2, 'true-false', 'The Moon has its own light.', 10, 800, 'The Moon reflects sunlight — it does not produce its own light.', 5, tf(false));

    const gen3 = addQuiz('Food & Nutrition', 'What you eat and why it matters.', 'Health');
    addQ(gen3, 'multiple-choice', 'Which vitamin is obtained from sunlight?', 15, 1000, 'The body produces Vitamin D when exposed to sunlight.', 0, mc('Vitamin D', 'Vitamin A', 'Vitamin C', 'Vitamin B12'));
    addQ(gen3, 'multiple-choice', 'What nutrient is rice primarily a source of?', 15, 800, 'Rice is primarily a source of carbohydrates.', 1, mc('Carbohydrates', 'Protein', 'Fats', 'Vitamins'));
    addQ(gen3, 'multiple-choice', 'Which food group provides the most protein?', 15, 1000, 'Meat, fish, eggs, and legumes are the primary protein sources.', 2, mc('Meat, fish, eggs and legumes', 'Bread and cereals', 'Fruits and vegetables', 'Oils and fats'));
    addQ(gen3, 'multiple-choice', 'What disease is caused by a lack of Vitamin C?', 20, 1000, 'Scurvy is caused by prolonged Vitamin C deficiency.', 3, mc('Scurvy', 'Rickets', 'Anaemia', 'Beri-beri'));
    addQ(gen3, 'multiple-choice', 'How many litres of water should an adult drink daily (approximately)?', 15, 800, 'Adults should aim for about 2 litres (8 glasses) of water daily.', 4, mc('2 litres', '0.5 litres', '5 litres', '10 litres'));
    addQ(gen3, 'true-false', 'Carrots help improve your eyesight.', 15, 800, 'Carrots contain beta-carotene (Vitamin A) which supports eye health, though they won\'t give you superhuman vision.', 5, tf(true));

    const gen4 = addQuiz('Music & Arts', 'Creative expression around the world.', 'Arts');
    addQ(gen4, 'multiple-choice', 'How many notes are in a musical octave?', 15, 1000, 'An octave contains 8 notes (hence "oct-").', 0, mc('8', '6', '7', '12'));
    addQ(gen4, 'multiple-choice', 'What does "forte" mean in music?', 15, 800, '"Forte" means to play loudly.', 1, mc('Loud', 'Soft', 'Fast', 'Slow'));
    addQ(gen4, 'multiple-choice', 'Which instrument has 88 keys?', 10, 800, 'A standard piano has 88 keys (52 white, 36 black).', 2, mc('Piano', 'Organ', 'Accordion', 'Harpsichord'));
    addQ(gen4, 'multiple-choice', 'Fela Kuti is known as the pioneer of which music genre?', 20, 1200, 'Fela Kuti created Afrobeat by fusing traditional Yoruba music with jazz and funk.', 3, mc('Afrobeat', 'Highlife', 'Jùjú', 'Fuji'));
    addQ(gen4, 'multiple-choice', 'What are the three primary colours in art?', 10, 800, 'The primary colours are red, blue, and yellow.', 4, mc('Red, blue, yellow', 'Red, green, blue', 'Cyan, magenta, yellow', 'Red, orange, purple'));
    addQ(gen4, 'true-false', 'The Mona Lisa was painted by Leonardo da Vinci.', 10, 800, 'Leonardo da Vinci painted the Mona Lisa between 1503 and 1519.', 5, tf(true));

    // ─── MORE MATHS ───
    const math4 = addQuiz('Algebra Foundations', 'Solve for x and beyond!', 'Mathematics');
    addQ(math4, 'multiple-choice', 'If x + 5 = 12, what is x?', 15, 800, 'x = 12 − 5 = 7.', 0, mc('7', '5', '8', '6'));
    addQ(math4, 'multiple-choice', 'What is the value of 3x when x = 4?', 15, 800, '3 × 4 = 12.', 1, mc('12', '7', '34', '9'));
    addQ(math4, 'multiple-choice', 'Simplify: 2(x + 3)', 20, 1000, 'Distribute: 2x + 6.', 2, mc('2x + 6', '2x + 3', 'x + 6', '2x + 5'));
    addQ(math4, 'multiple-choice', 'If 2x = 10, what is x?', 10, 800, 'x = 10 ÷ 2 = 5.', 3, mc('5', '10', '20', '2'));
    addQ(math4, 'multiple-choice', 'What is the value of x² when x = 6?', 15, 1000, '6² = 36.', 4, mc('36', '12', '18', '66'));
    addQ(math4, 'multiple-choice', 'Solve: 3x − 7 = 14', 20, 1000, '3x = 21, so x = 7.', 5, mc('7', '3', '21', '9'));

    // ─── ENVIRONMENTAL SCIENCE ───
    const env1 = addQuiz('Environment & Climate', 'Our planet and the challenges it faces.', 'Science');
    addQ(env1, 'multiple-choice', 'What gas is most responsible for global warming?', 15, 1000, 'Carbon dioxide (CO₂) is the main greenhouse gas driving global warming.', 0, mc('Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'));
    addQ(env1, 'multiple-choice', 'What is the ozone layer\'s primary function?', 20, 1000, 'The ozone layer absorbs most of the Sun\'s harmful ultraviolet radiation.', 1, mc('Absorbs UV radiation', 'Produces oxygen', 'Regulates temperature', 'Creates rain'));
    addQ(env1, 'multiple-choice', 'What are the "3 Rs" of waste management?', 15, 800, 'Reduce, Reuse, Recycle — in order of environmental impact.', 2, mc('Reduce, Reuse, Recycle', 'Read, Rest, Relax', 'Return, Repair, Remove', 'Research, Review, Report'));
    addQ(env1, 'multiple-choice', 'Which energy source is renewable?', 15, 1000, 'Solar energy is renewable — the Sun will keep producing energy for billions of years.', 3, mc('Solar', 'Coal', 'Natural gas', 'Petroleum'));
    addQ(env1, 'multiple-choice', 'What is deforestation?', 10, 800, 'Deforestation is the large-scale removal of forests.', 4, mc('Clearing forests', 'Planting trees', 'Studying forests', 'Protecting wildlife'));
    addQ(env1, 'true-false', 'Plastic takes over 400 years to decompose.', 15, 800, 'Most plastics take 400–1000 years to decompose in landfills.', 5, tf(true));

    // ─── RELIGIOUS STUDIES (neutral, educational) ───
    const rs1 = addQuiz('World Religions', 'Basic facts about major world religions.', 'Social Studies');
    addQ(rs1, 'multiple-choice', 'What is the holy book of Islam?', 10, 800, 'The Quran is the central religious text of Islam.', 0, mc('Quran', 'Bible', 'Torah', 'Vedas'));
    addQ(rs1, 'multiple-choice', 'Which religion celebrates Diwali?', 15, 1000, 'Diwali is a major festival celebrated by Hindus, Jains, and Sikhs.', 1, mc('Hinduism', 'Buddhism', 'Christianity', 'Judaism'));
    addQ(rs1, 'multiple-choice', 'What city is holy to Judaism, Christianity, and Islam?', 15, 1000, 'Jerusalem is considered a holy city by all three Abrahamic religions.', 2, mc('Jerusalem', 'Mecca', 'Rome', 'Varanasi'));
    addQ(rs1, 'multiple-choice', 'Who is the founder of Buddhism?', 15, 1000, 'Siddhartha Gautama, known as the Buddha, founded Buddhism around 500 BCE.', 3, mc('Siddhartha Gautama', 'Confucius', 'Lao Tzu', 'Muhammad'));
    addQ(rs1, 'multiple-choice', 'How many pillars of Islam are there?', 10, 800, 'The Five Pillars are: Shahada, Salah, Zakat, Sawm, and Hajj.', 4, mc('5', '3', '7', '4'));
    addQ(rs1, 'true-false', 'Christmas celebrates the birth of Jesus Christ.', 10, 800, 'Christmas is an annual Christian festival celebrating the birth of Jesus Christ.', 5, tf(true));
  });

  seedAll();
  if (!repairOnly) {
    console.log('Seeded 22 extra quizzes with 132 total questions.');
  } else if (repairedCount > 0) {
    console.log(`Repaired correct answers on ${repairedCount} seeded questions.`);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
