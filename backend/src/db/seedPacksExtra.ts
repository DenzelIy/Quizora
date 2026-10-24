import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedExtraContentPacks() {
  const db = getDb();

  const existing = db.prepare("SELECT COUNT(*) as count FROM content_packs WHERE slug = 'civic-education-basics'").get() as { count: number };
  if (existing.count > 0) return;

  const insertPack = db.prepare(
    `INSERT INTO content_packs (id, slug, title, description, category, subject, tags, difficulty, grade_level, curriculum, author, source, license, version, status, pack_type, estimated_duration_min, total_questions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertObjective = db.prepare(
    'INSERT INTO pack_objectives (id, pack_id, text, order_index) VALUES (?, ?, ?, ?)'
  );
  const insertChapter = db.prepare(
    'INSERT INTO pack_chapters (id, pack_id, title, description, content_text, order_index, chapter_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO pack_questions (id, pack_id, chapter_id, type, text, time_limit, points, explanation, topic, difficulty, order_index, math_notation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO pack_answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );
  const insertScene = db.prepare(
    'INSERT INTO pack_scenes (id, pack_id, title, narrator_text, narrator_mood, order_index, question_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const addQ = (
    packId: string, chapterId: string | null, type: string, text: string,
    timeLimit: number, points: number, explanation: string, topic: string,
    difficulty: string, orderIndex: number, mathNotation: number,
    answers: { text: string; correct: boolean }[]
  ) => {
    const qId = randomUUID();
    insertQuestion.run(qId, packId, chapterId, type, text, timeLimit, points, explanation, topic, difficulty, orderIndex, mathNotation);
    answers.forEach((a, i) => insertAnswer.run(randomUUID(), qId, a.text, a.correct ? 1 : 0, i));
    return qId;
  };

  const seedAll = db.transaction(() => {
    // =========================================================
    // CULTURE: Civic Education
    // =========================================================
    const civic = randomUUID();
    insertPack.run(civic, 'civic-education-basics', 'Civic Education: Rights and Responsibilities',
      'Understand your rights as a Nigerian citizen and the responsibilities that come with them. Covers the constitution, government structure, and civic duties.',
      'culture', 'Civic Education', JSON.stringify(['civic-education', 'rights', 'constitution', 'government', 'citizenship']),
      'intermediate', 'JSS 1-3', 'NERDC-aligned', 'Educational content', 'Original educational content',
      'original', 1, 'active', 'standard', 15, 6);

    insertObjective.run(randomUUID(), civic, 'Identify fundamental human rights in the Nigerian constitution', 0);
    insertObjective.run(randomUUID(), civic, 'Explain the structure of government in Nigeria', 1);
    insertObjective.run(randomUUID(), civic, 'Describe the duties and obligations of a Nigerian citizen', 2);

    const civCh1 = randomUUID();
    insertChapter.run(civCh1, civic, 'Fundamental Human Rights',
      'Your rights as a Nigerian citizen',
      'Chapter IV of the 1999 Constitution of Nigeria guarantees fundamental human rights to every citizen. These include the right to life, the right to dignity of the human person, the right to personal liberty, the right to fair hearing, the right to freedom of thought, conscience and religion, the right to freedom of expression and the press, the right to peaceful assembly, and the right to freedom of movement.',
      0, 'content');

    const civCh2 = randomUUID();
    insertChapter.run(civCh2, civic, 'Structure of Government',
      'How Nigeria is governed',
      'Nigeria operates a federal system of government with three tiers: the Federal Government, 36 State Governments, and 774 Local Government Areas. Each tier has three arms: the Executive (enforces laws), the Legislature (makes laws), and the Judiciary (interprets laws). The National Assembly consists of the Senate (109 members) and the House of Representatives (360 members).',
      1, 'content');

    const civCh3 = randomUUID();
    insertChapter.run(civCh3, civic, 'Civic Duties and Obligations',
      'Your responsibilities as a citizen',
      'Citizens have duties such as: obeying the law, paying taxes, voting during elections, serving on jury duty if called, respecting the rights of others, defending the country if necessary, and participating in community development. Rights and responsibilities go hand in hand — you cannot enjoy one without fulfilling the other.',
      2, 'content');

    addQ(civic, civCh1, 'multiple-choice', 'Which chapter of the 1999 Nigerian Constitution deals with fundamental human rights?', 20, 1000,
      'Chapter IV (Chapter 4) of the 1999 Constitution of Nigeria contains the fundamental rights provisions.', 'Constitution', 'medium', 0, 0, [
        { text: 'Chapter I', correct: false },
        { text: 'Chapter II', correct: false },
        { text: 'Chapter IV', correct: true },
        { text: 'Chapter VI', correct: false },
      ]);

    addQ(civic, civCh2, 'multiple-choice', 'How many tiers of government does Nigeria have?', 15, 800,
      'Nigeria has three tiers: Federal, State, and Local Government.', 'Government structure', 'easy', 1, 0, [
        { text: '2', correct: false },
        { text: '3', correct: true },
        { text: '4', correct: false },
        { text: '5', correct: false },
      ]);

    addQ(civic, civCh2, 'multiple-choice', 'How many members are in the Nigerian Senate?', 20, 1000,
      'The Senate has 109 members — 3 from each of the 36 states plus 1 from the Federal Capital Territory.', 'Legislature', 'medium', 2, 0, [
        { text: '36', correct: false },
        { text: '109', correct: true },
        { text: '360', correct: false },
        { text: '774', correct: false },
      ]);

    addQ(civic, civCh2, 'multiple-choice', 'Which arm of government is responsible for making laws?', 15, 800,
      'The Legislature makes laws. In Nigeria, this is the National Assembly at the federal level.', 'Government arms', 'easy', 3, 0, [
        { text: 'Executive', correct: false },
        { text: 'Judiciary', correct: false },
        { text: 'Legislature', correct: true },
        { text: 'Military', correct: false },
      ]);

    addQ(civic, civCh3, 'true-false', 'Paying taxes is a civic responsibility of Nigerian citizens.', 15, 800,
      'Yes, paying taxes is one of the civic duties listed in the constitution. Tax revenue funds public services and infrastructure.', 'Civic duties', 'easy', 4, 0, [
        { text: 'True', correct: true },
        { text: 'False', correct: false },
      ]);

    addQ(civic, civCh1, 'multiple-choice', 'Which of these is NOT a fundamental right in the Nigerian constitution?', 25, 1200,
      'The right to free education at all levels is not a fundamental right (Chapter IV). Education falls under Directive Principles of State Policy (Chapter II), which are not justiciable.', 'Rights vs directives', 'hard', 5, 0, [
        { text: 'Right to life', correct: false },
        { text: 'Right to freedom of expression', correct: false },
        { text: 'Right to free education at all levels', correct: true },
        { text: 'Right to freedom of movement', correct: false },
      ]);


    // =========================================================
    // CULTURE: Nigerian Geography (narrative mode)
    // =========================================================
    const geo = randomUUID();
    insertPack.run(geo, 'nigerian-geography', 'Exploring Nigeria\'s Geography',
      'A journey across Nigeria\'s diverse landscapes — from the Sahel in the north to the mangrove swamps of the Niger Delta, the highlands of Jos, and the rainforests of the south.',
      'culture', 'Geography', JSON.stringify(['geography', 'nigeria', 'rivers', 'climate', 'vegetation']),
      'beginner', 'Primary 5 - JSS 2', 'NERDC-aligned', 'Educational content', 'Original educational content',
      'original', 1, 'active', 'narrative', 20, 5);

    insertObjective.run(randomUUID(), geo, 'Identify Nigeria\'s major geographical features', 0);
    insertObjective.run(randomUUID(), geo, 'Name the two main rivers and their significance', 1);
    insertObjective.run(randomUUID(), geo, 'Describe Nigeria\'s vegetation zones from north to south', 2);

    const geoCh1 = randomUUID();
    insertChapter.run(geoCh1, geo, 'Where is Nigeria?',
      'Location and neighbours',
      'Nigeria is located in West Africa, on the Gulf of Guinea. It shares borders with Benin to the west, Niger to the north, Chad to the northeast, and Cameroon to the east. With over 200 million people, it is the most populous country in Africa. The country covers about 923,768 square kilometres.',
      0, 'intro');

    const geoCh2 = randomUUID();
    insertChapter.run(geoCh2, geo, 'Rivers and Water Bodies',
      'The lifeblood of the land',
      'The two most important rivers are the Niger (which gives the country its name) and the Benue. They meet at Lokoja in Kogi State, forming one of the most significant river confluences in Africa. Other notable water features include Lake Chad in the northeast, the Cross River in the southeast, and the lagoon system around Lagos.',
      1, 'content');

    const geoCh3 = randomUUID();
    insertChapter.run(geoCh3, geo, 'Vegetation Zones',
      'From desert to rainforest',
      'Nigeria has four main vegetation zones running roughly from north to south: the Sahel savanna (dry, sparse vegetation), the Sudan savanna (grasslands with scattered trees), the Guinea savanna (tall grasses and woodland), and the tropical rainforest (dense, lush vegetation in the south). Along the coast, you find mangrove swamps and freshwater swamps in the Niger Delta.',
      2, 'content');

    const gq1 = addQ(geo, geoCh1, 'multiple-choice', 'Which continent is Nigeria located in?', 15, 800,
      'Nigeria is in West Africa.', 'Location', 'easy', 0, 0, [
        { text: 'East Africa', correct: false },
        { text: 'West Africa', correct: true },
        { text: 'Southern Africa', correct: false },
        { text: 'North Africa', correct: false },
      ]);

    const gq2 = addQ(geo, geoCh2, 'multiple-choice', 'Where do the Rivers Niger and Benue meet?', 20, 1000,
      'The Niger and Benue rivers meet at Lokoja in Kogi State.', 'Rivers', 'medium', 1, 0, [
        { text: 'Abuja, FCT', correct: false },
        { text: 'Lokoja, Kogi State', correct: true },
        { text: 'Onitsha, Anambra State', correct: false },
        { text: 'Makurdi, Benue State', correct: false },
      ]);

    addQ(geo, geoCh1, 'multiple-choice', 'Which country borders Nigeria to the west?', 15, 800,
      'Benin (formerly Dahomey) is Nigeria\'s western neighbour.', 'Borders', 'easy', 2, 0, [
        { text: 'Ghana', correct: false },
        { text: 'Cameroon', correct: false },
        { text: 'Benin', correct: true },
        { text: 'Togo', correct: false },
      ]);

    addQ(geo, geoCh3, 'multiple-choice', 'Which vegetation zone is found in the far north of Nigeria?', 20, 1000,
      'The Sahel savanna, characterised by dry conditions and sparse vegetation, is found in the far north.', 'Vegetation', 'medium', 3, 0, [
        { text: 'Tropical rainforest', correct: false },
        { text: 'Guinea savanna', correct: false },
        { text: 'Sahel savanna', correct: true },
        { text: 'Mangrove swamp', correct: false },
      ]);

    addQ(geo, geoCh2, 'true-false', 'The River Niger gave Nigeria its name.', 15, 800,
      'The name Nigeria was coined by Flora Shaw (who later married Lord Lugard) in 1897, derived from the River Niger.', 'Rivers', 'easy', 4, 0, [
        { text: 'True', correct: true },
        { text: 'False', correct: false },
      ]);

    // Griot scenes for geography
    insertScene.run(randomUUID(), geo, 'Welcome, Traveller', 'Come! Let me take you on a journey across one of Africa\'s greatest nations — Nigeria! From the dry sands of the north to the great ocean in the south, this land holds wonders you must see.', 'excited', 0, null);
    insertScene.run(randomUUID(), geo, 'The Land', 'Nigeria sits in the curve of West Africa, looking out at the Gulf of Guinea. To the west is Benin, to the north is Niger, to the northeast is Chad, and to the east is Cameroon.', 'neutral', 1, gq1);
    insertScene.run(randomUUID(), geo, 'The Great Rivers', 'Now, listen carefully. Two mighty rivers flow through this land — the Niger, from which the country takes its name, and the Benue. They travel far and wide until they meet... Can you guess where?', 'thinking', 2, gq2);
    insertScene.run(randomUUID(), geo, 'Changing Landscapes', 'As you travel from north to south, the land changes. The dry Sahel gives way to grasslands, then thick forests, and finally the great swamps of the Niger Delta, where the rivers reach the sea.', 'happy', 3, null);
    insertScene.run(randomUUID(), geo, 'A Rich Land', 'From the tin mines of Jos Plateau to the oil beneath the Delta waters, from the groundnut pyramids of Kano to the cocoa farms of the west — Nigeria is truly a land of abundance. And now you know her geography!', 'happy', 4, null);


    // =========================================================
    // STEM: Basic Chemistry
    // =========================================================
    const chem = randomUUID();
    insertPack.run(chem, 'basic-chemistry-elements', 'Introduction to Chemistry: Elements and Compounds',
      'Learn about atoms, elements, compounds, and the periodic table. Understand the building blocks of matter.',
      'stem', 'Chemistry', JSON.stringify(['chemistry', 'elements', 'atoms', 'periodic-table', 'compounds']),
      'intermediate', 'JSS 2-3', 'NERDC-aligned', 'Educational content', 'Original educational content',
      'original', 1, 'active', 'standard', 18, 6);

    insertObjective.run(randomUUID(), chem, 'Define atoms, elements, and compounds', 0);
    insertObjective.run(randomUUID(), chem, 'Read and use chemical symbols', 1);
    insertObjective.run(randomUUID(), chem, 'Distinguish between elements, compounds, and mixtures', 2);

    const chemCh1 = randomUUID();
    insertChapter.run(chemCh1, chem, 'Atoms and Elements',
      'The building blocks of matter',
      'Everything around us is made of matter, and matter is made of tiny particles called atoms. An element is a substance made of only one type of atom. There are 118 known elements, organised in the periodic table. Each element has a chemical symbol — for example, H for hydrogen, O for oxygen, Fe for iron (from the Latin ferrum), and Au for gold (from the Latin aurum).',
      0, 'content');

    const chemCh2 = randomUUID();
    insertChapter.run(chemCh2, chem, 'Compounds and Mixtures',
      'When elements combine',
      'A compound is formed when two or more elements chemically combine in a fixed ratio. For example, water (H₂O) is a compound of hydrogen and oxygen. A mixture, on the other hand, contains two or more substances that are not chemically combined — they can be separated by physical means like filtering, evaporation, or distillation.',
      1, 'content');

    addQ(chem, chemCh1, 'multiple-choice', 'What is the chemical symbol for iron?', 15, 800,
      'The symbol Fe comes from the Latin word "ferrum" meaning iron.', 'Chemical symbols', 'easy', 0, 0, [
        { text: 'Ir', correct: false },
        { text: 'In', correct: false },
        { text: 'Fe', correct: true },
        { text: 'I', correct: false },
      ]);

    addQ(chem, chemCh1, 'multiple-choice', 'What is an atom?', 20, 1000,
      'An atom is the smallest unit of an element that retains the chemical properties of that element.', 'Atomic structure', 'easy', 1, 0, [
        { text: 'A type of molecule', correct: false },
        { text: 'The smallest particle of an element', correct: true },
        { text: 'A chemical reaction', correct: false },
        { text: 'A type of compound', correct: false },
      ]);

    addQ(chem, chemCh2, 'multiple-choice', 'What is the chemical formula for water?', 15, 800,
      'Water is H₂O — two hydrogen atoms bonded to one oxygen atom.', 'Compounds', 'easy', 2, 0, [
        { text: 'HO₂', correct: false },
        { text: 'H₂O', correct: true },
        { text: 'OH', correct: false },
        { text: 'H₂O₂', correct: false },
      ]);

    addQ(chem, chemCh2, 'multiple-choice', 'Which of these is a mixture, not a compound?', 25, 1200,
      'Salt water is a mixture because the salt and water are not chemically bonded and can be separated by evaporation.', 'Mixtures vs compounds', 'medium', 3, 0, [
        { text: 'Water (H₂O)', correct: false },
        { text: 'Table salt (NaCl)', correct: false },
        { text: 'Salt water', correct: true },
        { text: 'Carbon dioxide (CO₂)', correct: false },
      ]);

    addQ(chem, chemCh1, 'true-false', 'The periodic table contains over 200 elements.', 15, 800,
      'As of now, there are 118 confirmed elements in the periodic table.', 'Periodic table', 'easy', 4, 0, [
        { text: 'True', correct: false },
        { text: 'False', correct: true },
      ]);

    addQ(chem, chemCh2, 'multiple-choice', 'What method can be used to separate salt from water?', 20, 1000,
      'Evaporation heats the water until it turns to steam, leaving the salt behind.', 'Separation techniques', 'medium', 5, 0, [
        { text: 'Magnetism', correct: false },
        { text: 'Evaporation', correct: true },
        { text: 'Sieving', correct: false },
        { text: 'Decanting', correct: false },
      ]);


    // =========================================================
    // STEM: Basic Physics
    // =========================================================
    const phys = randomUUID();
    insertPack.run(phys, 'basic-physics-forces', 'Forces and Motion',
      'Explore the fundamental concepts of forces, motion, speed, and gravity. Learn how objects move and why.',
      'stem', 'Physics', JSON.stringify(['physics', 'forces', 'motion', 'gravity', 'speed']),
      'intermediate', 'JSS 1-3', 'NERDC-aligned', 'Educational content', 'Original educational content',
      'original', 1, 'active', 'standard', 18, 6);

    insertObjective.run(randomUUID(), phys, 'Define force and identify types of forces', 0);
    insertObjective.run(randomUUID(), phys, 'Calculate speed using the formula speed = distance ÷ time', 1);
    insertObjective.run(randomUUID(), phys, 'Explain the effects of gravity on objects', 2);

    const physCh1 = randomUUID();
    insertChapter.run(physCh1, phys, 'What is Force?',
      'Pushes, pulls, and their effects',
      'A force is a push or pull that can change the shape, speed, or direction of an object. Forces are measured in Newtons (N), named after Sir Isaac Newton. Common types of forces include gravitational force (pulls objects toward Earth), friction (opposes motion between surfaces), magnetic force, and elastic force (like a stretched rubber band).',
      0, 'content');

    const physCh2 = randomUUID();
    insertChapter.run(physCh2, phys, 'Speed and Motion',
      'How fast things move',
      'Speed tells us how fast an object is moving. It is calculated using the formula: Speed = Distance ÷ Time. The SI unit of speed is metres per second (m/s). For example, if a car travels 100 metres in 20 seconds, its speed is 100 ÷ 20 = 5 m/s. When an object changes speed or direction, we say it is accelerating.',
      1, 'content');

    addQ(phys, physCh1, 'multiple-choice', 'What is the SI unit of force?', 15, 800,
      'Force is measured in Newtons (N), named after Sir Isaac Newton.', 'Units', 'easy', 0, 0, [
        { text: 'Joule', correct: false },
        { text: 'Watt', correct: false },
        { text: 'Newton', correct: true },
        { text: 'Pascal', correct: false },
      ]);

    addQ(phys, physCh1, 'multiple-choice', 'Which force opposes motion between two surfaces?', 20, 1000,
      'Friction is the force that opposes the relative motion of two surfaces in contact.', 'Types of forces', 'easy', 1, 0, [
        { text: 'Gravity', correct: false },
        { text: 'Friction', correct: true },
        { text: 'Magnetism', correct: false },
        { text: 'Tension', correct: false },
      ]);

    addQ(phys, physCh2, 'multiple-choice', 'A cyclist travels 150 metres in 30 seconds. What is their speed?', 25, 1200,
      'Speed = Distance ÷ Time = 150 ÷ 30 = 5 m/s', 'Speed calculation', 'medium', 2, 1, [
        { text: '3 m/s', correct: false },
        { text: '4.5 m/s', correct: false },
        { text: '5 m/s', correct: true },
        { text: '6 m/s', correct: false },
      ]);

    addQ(phys, physCh1, 'multiple-choice', 'What happens to an object when the forces acting on it are balanced?', 20, 1000,
      'When forces are balanced (equal and opposite), the object stays at rest or continues moving at the same speed in the same direction — this is Newton\'s First Law.', 'Balanced forces', 'medium', 3, 0, [
        { text: 'It speeds up', correct: false },
        { text: 'It slows down', correct: false },
        { text: 'It stays the same (at rest or constant speed)', correct: true },
        { text: 'It changes direction', correct: false },
      ]);

    addQ(phys, physCh1, 'true-false', 'Gravity pulls objects toward the centre of the Earth.', 15, 800,
      'Gravitational force pulls all objects toward the centre of the Earth (and toward each other, though the effect is only noticeable with very massive objects).', 'Gravity', 'easy', 4, 0, [
        { text: 'True', correct: true },
        { text: 'False', correct: false },
      ]);

    addQ(phys, physCh2, 'multiple-choice', 'What is the formula for calculating speed?', 15, 800,
      'Speed = Distance ÷ Time (often written as s = d/t).', 'Speed formula', 'easy', 5, 1, [
        { text: 'Speed = Time × Distance', correct: false },
        { text: 'Speed = Distance ÷ Time', correct: true },
        { text: 'Speed = Force × Mass', correct: false },
        { text: 'Speed = Distance × Time', correct: false },
      ]);
  });

  seedAll();
  console.log('Seeded 4 additional content packs (2 culture, 2 STEM).');
}
