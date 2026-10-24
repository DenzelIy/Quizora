import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedUpgradeD() {
  const db = getDb();

  const check = db.prepare(
    "SELECT COUNT(*) as count FROM questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.title = 'Animal Kingdom'"
  ).get() as { count: number };
  if (check.count > 10) return;

  const findQuiz = db.prepare('SELECT id FROM quizzes WHERE title = ?');
  const insertQuestion = db.prepare(
    'INSERT INTO questions (id, quiz_id, type, text, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );

  const addQ = (
    quizId: string,
    text: string,
    timeLimit: number,
    points: number,
    explanation: string,
    orderIndex: number,
    answers: { text: string; isCorrect: boolean }[]
  ) => {
    const id = randomUUID();
    insertQuestion.run(id, quizId, 'multiple-choice', text, timeLimit, points, explanation, orderIndex);
    answers.forEach((a, i) => {
      insertAnswer.run(randomUUID(), id, a.text, a.isCorrect ? 1 : 0, i);
    });
  };

  const seedAll = db.transaction(() => {
    // ─── ANIMAL KINGDOM ───
    const ak = (findQuiz.get('Animal Kingdom') as { id: string } | undefined)?.id;
    if (ak) {
      addQ(ak, 'What is the largest land animal?', 15, 1000,
        'The African elephant is the largest land animal, weighing up to 6,000 kg.', 6,
        [{ text: 'African elephant', isCorrect: true }, { text: 'White rhinoceros', isCorrect: false }, { text: 'Hippopotamus', isCorrect: false }, { text: 'Giraffe', isCorrect: false }]);
      addQ(ak, 'How many legs does an insect have?', 15, 800,
        'All insects have exactly 6 legs, arranged in 3 pairs.', 7,
        [{ text: '4', isCorrect: false }, { text: '6', isCorrect: true }, { text: '8', isCorrect: false }, { text: '10', isCorrect: false }]);
      addQ(ak, 'What is a group of fish called?', 15, 800,
        'A group of fish swimming together is called a school (or shoal).', 8,
        [{ text: 'Flock', isCorrect: false }, { text: 'Herd', isCorrect: false }, { text: 'School', isCorrect: true }, { text: 'Pack', isCorrect: false }]);
      addQ(ak, 'Which animal can change its colour for camouflage?', 20, 1000,
        'Chameleons change colour using special cells called chromatophores in their skin.', 9,
        [{ text: 'Gecko', isCorrect: false }, { text: 'Chameleon', isCorrect: true }, { text: 'Iguana', isCorrect: false }, { text: 'Frog', isCorrect: false }]);
      addQ(ak, 'What is the tallest animal in the world?', 15, 800,
        'Giraffes can grow up to 5.5 metres tall, making them the tallest living animals.', 10,
        [{ text: 'Elephant', isCorrect: false }, { text: 'Giraffe', isCorrect: true }, { text: 'Ostrich', isCorrect: false }, { text: 'Camel', isCorrect: false }]);
      addQ(ak, 'Which mammal can fly?', 15, 1000,
        'Bats are the only mammals capable of sustained flight.', 11,
        [{ text: 'Flying squirrel', isCorrect: false }, { text: 'Bat', isCorrect: true }, { text: 'Sugar glider', isCorrect: false }, { text: 'Colugo', isCorrect: false }]);
      addQ(ak, 'What is the largest species of shark?', 20, 1000,
        'The whale shark can grow up to 12 metres long and is a gentle filter feeder.', 12,
        [{ text: 'Great white shark', isCorrect: false }, { text: 'Hammerhead shark', isCorrect: false }, { text: 'Whale shark', isCorrect: true }, { text: 'Tiger shark', isCorrect: false }]);
      addQ(ak, 'How many arms does an octopus have?', 15, 800,
        'An octopus has 8 arms, each lined with suckers.', 13,
        [{ text: '6', isCorrect: false }, { text: '8', isCorrect: true }, { text: '10', isCorrect: false }, { text: '12', isCorrect: false }]);
      addQ(ak, 'What animal is known as the "King of the Jungle"?', 15, 800,
        'The lion is called the King of the Jungle due to its powerful build and mane, although it actually lives in grasslands and savannas.', 14,
        [{ text: 'Tiger', isCorrect: false }, { text: 'Gorilla', isCorrect: false }, { text: 'Lion', isCorrect: true }, { text: 'Leopard', isCorrect: false }]);
    }

    // ─── FOOD & NUTRITION ───
    const fn = (findQuiz.get('Food & Nutrition') as { id: string } | undefined)?.id;
    if (fn) {
      addQ(fn, 'What mineral is important for strong bones?', 15, 1000,
        'Calcium is essential for building and maintaining strong bones and teeth.', 6,
        [{ text: 'Iron', isCorrect: false }, { text: 'Calcium', isCorrect: true }, { text: 'Potassium', isCorrect: false }, { text: 'Zinc', isCorrect: false }]);
      addQ(fn, 'Which food is a good source of iron?', 20, 1000,
        'Spinach and red meat are both excellent sources of dietary iron.', 7,
        [{ text: 'White rice', isCorrect: false }, { text: 'Spinach', isCorrect: true }, { text: 'Banana', isCorrect: false }, { text: 'Bread', isCorrect: false }]);
      addQ(fn, 'What is the main function of fibre in the diet?', 20, 1000,
        'Dietary fibre aids digestion by adding bulk to food and helping prevent constipation.', 8,
        [{ text: 'Provides energy', isCorrect: false }, { text: 'Builds muscle', isCorrect: false }, { text: 'Aids digestion and prevents constipation', isCorrect: true }, { text: 'Strengthens bones', isCorrect: false }]);
      addQ(fn, 'What nutrient do beans and eggs provide?', 15, 800,
        'Beans and eggs are rich sources of protein, which is needed for growth and repair of body tissues.', 9,
        [{ text: 'Fats', isCorrect: false }, { text: 'Carbohydrates', isCorrect: false }, { text: 'Protein', isCorrect: true }, { text: 'Vitamins', isCorrect: false }]);
      addQ(fn, 'What is malnutrition?', 20, 1000,
        'Malnutrition is a condition caused by not getting the right amount of nutrients — either too few or too many.', 10,
        [{ text: 'Eating too much food', isCorrect: false }, { text: 'A condition caused by not getting the right nutrients', isCorrect: true }, { text: 'A type of food poisoning', isCorrect: false }, { text: 'An allergy to certain foods', isCorrect: false }]);
      addQ(fn, 'What food group do bread, rice, and yam belong to?', 15, 800,
        'Bread, rice, and yam are all carbohydrates, which provide the body with energy.', 11,
        [{ text: 'Proteins', isCorrect: false }, { text: 'Fats and oils', isCorrect: false }, { text: 'Carbohydrates', isCorrect: true }, { text: 'Vitamins', isCorrect: false }]);
      addQ(fn, 'What is the difference between a vitamin and a mineral?', 25, 1200,
        'Vitamins are organic compounds made by plants and animals, while minerals are inorganic elements from the soil and water.', 12,
        [{ text: 'Vitamins are organic, minerals are inorganic', isCorrect: true }, { text: 'They are exactly the same', isCorrect: false }, { text: 'Minerals come from animals, vitamins from rocks', isCorrect: false }, { text: 'Vitamins are found only in meat', isCorrect: false }]);
      addQ(fn, 'Which organ produces bile to help digest fats?', 20, 1000,
        'The liver produces bile, which is stored in the gallbladder and released into the small intestine to break down fats.', 13,
        [{ text: 'Stomach', isCorrect: false }, { text: 'Liver', isCorrect: true }, { text: 'Pancreas', isCorrect: false }, { text: 'Kidney', isCorrect: false }]);
      addQ(fn, 'What disease is caused by lack of iron?', 15, 1000,
        'Iron deficiency leads to anaemia, a condition where the blood lacks enough healthy red blood cells.', 14,
        [{ text: 'Scurvy', isCorrect: false }, { text: 'Rickets', isCorrect: false }, { text: 'Anaemia', isCorrect: true }, { text: 'Goitre', isCorrect: false }]);
    }

    // ─── MUSIC & ARTS ───
    const ma = (findQuiz.get('Music & Arts') as { id: string } | undefined)?.id;
    if (ma) {
      addQ(ma, 'What are the seven colours of the rainbow in order?', 25, 1200,
        'The colours are Red, Orange, Yellow, Green, Blue, Indigo, and Violet (remembered as ROYGBIV).', 6,
        [{ text: 'Red, orange, yellow, green, blue, indigo, violet', isCorrect: true }, { text: 'Red, yellow, green, blue, purple, pink, white', isCorrect: false }, { text: 'Orange, red, green, blue, violet, yellow, indigo', isCorrect: false }, { text: 'Pink, red, orange, yellow, green, blue, purple', isCorrect: false }]);
      addQ(ma, 'What musical instrument does a drummer play?', 15, 800,
        'A drummer plays drums — a percussion instrument struck with sticks, mallets, or hands.', 7,
        [{ text: 'Guitar', isCorrect: false }, { text: 'Drums', isCorrect: true }, { text: 'Flute', isCorrect: false }, { text: 'Violin', isCorrect: false }]);
      addQ(ma, 'Who composed the famous "Hallelujah Chorus"?', 20, 1000,
        'George Frideric Handel composed the Hallelujah Chorus as part of his oratorio "Messiah" in 1741.', 8,
        [{ text: 'Ludwig van Beethoven', isCorrect: false }, { text: 'Wolfgang Amadeus Mozart', isCorrect: false }, { text: 'George Frideric Handel', isCorrect: true }, { text: 'Johann Sebastian Bach', isCorrect: false }]);
      addQ(ma, 'What is a cappella singing?', 20, 1000,
        'A cappella is singing performed without any instrumental accompaniment.', 9,
        [{ text: 'Singing with a full orchestra', isCorrect: false }, { text: 'Singing without instrumental accompaniment', isCorrect: true }, { text: 'Singing with only a piano', isCorrect: false }, { text: 'Singing in a very loud voice', isCorrect: false }]);
      addQ(ma, 'Which of these is a classification of musical instruments?', 20, 1000,
        'Musical instruments are classified into groups such as string, wind (woodwind and brass), and percussion.', 10,
        [{ text: 'Loud, medium, and quiet', isCorrect: false }, { text: 'String, wind, and percussion', isCorrect: true }, { text: 'Big, small, and tiny', isCorrect: false }, { text: 'Fast, slow, and moderate', isCorrect: false }]);
      addQ(ma, 'What does "tempo" mean in music?', 15, 800,
        'Tempo refers to the speed or pace at which a piece of music is played.', 11,
        [{ text: 'The volume of music', isCorrect: false }, { text: 'The speed of a piece of music', isCorrect: true }, { text: 'The pitch of a note', isCorrect: false }, { text: 'The number of instruments', isCorrect: false }]);
      addQ(ma, 'What Nigerian musical genre blends traditional and Western pop?', 20, 1200,
        'Afrobeats is a contemporary genre from Nigeria that blends West African musical styles with elements of Western pop, hip hop, and electronic music.', 12,
        [{ text: 'Highlife', isCorrect: false }, { text: 'Jùjú', isCorrect: false }, { text: 'Afrobeats', isCorrect: true }, { text: 'Fuji', isCorrect: false }]);
      addQ(ma, 'What is the talking drum in Yoruba culture called?', 20, 1000,
        'The Dundun (also called gangan) is a Yoruba talking drum that can mimic the tones of Yoruba speech.', 13,
        [{ text: 'Djembe', isCorrect: false }, { text: 'Dundun', isCorrect: true }, { text: 'Bata', isCorrect: false }, { text: 'Conga', isCorrect: false }]);
      addQ(ma, 'What is sculpture?', 15, 800,
        'Sculpture is the art of making three-dimensional forms by carving, modelling, casting, or assembling materials.', 14,
        [{ text: 'Painting on canvas', isCorrect: false }, { text: 'Writing poetry', isCorrect: false }, { text: 'The art of making 3D forms by carving or modelling', isCorrect: true }, { text: 'Playing musical instruments', isCorrect: false }]);
    }

    // ─── WORLD RELIGIONS ───
    const wr = (findQuiz.get('World Religions') as { id: string } | undefined)?.id;
    if (wr) {
      addQ(wr, 'What is the holy book of Christianity?', 15, 800,
        'The Bible is the holy book of Christianity, consisting of the Old Testament and the New Testament.', 6,
        [{ text: 'Quran', isCorrect: false }, { text: 'Bible', isCorrect: true }, { text: 'Torah', isCorrect: false }, { text: 'Vedas', isCorrect: false }]);
      addQ(wr, 'What is Ramadan in Islam?', 20, 1000,
        'Ramadan is the ninth month of the Islamic calendar, during which Muslims fast from dawn to sunset.', 7,
        [{ text: 'A festival of lights', isCorrect: false }, { text: 'The month of fasting from dawn to sunset', isCorrect: true }, { text: 'A pilgrimage to Mecca', isCorrect: false }, { text: 'A weekly day of rest', isCorrect: false }]);
      addQ(wr, 'What symbol represents Christianity?', 15, 800,
        'The Cross is the primary symbol of Christianity, representing the crucifixion and resurrection of Jesus Christ.', 8,
        [{ text: 'Crescent and star', isCorrect: false }, { text: 'Star of David', isCorrect: false }, { text: 'The Cross', isCorrect: true }, { text: 'Om symbol', isCorrect: false }]);
      addQ(wr, 'Who is considered the founder of Christianity?', 15, 1000,
        'Jesus Christ is considered the founder of Christianity. His life and teachings form the basis of the Christian faith.', 9,
        [{ text: 'Prophet Muhammad', isCorrect: false }, { text: 'Moses', isCorrect: false }, { text: 'Jesus Christ', isCorrect: true }, { text: 'Abraham', isCorrect: false }]);
      addQ(wr, 'What is the Hajj?', 20, 1000,
        'The Hajj is the annual Islamic pilgrimage to Mecca in Saudi Arabia. It is one of the Five Pillars of Islam.', 10,
        [{ text: 'A daily prayer ritual', isCorrect: false }, { text: 'The annual Islamic pilgrimage to Mecca', isCorrect: true }, { text: 'A month of fasting', isCorrect: false }, { text: 'A charitable donation', isCorrect: false }]);
      addQ(wr, 'What is karma in Hinduism and Buddhism?', 25, 1200,
        'Karma is the principle that a person\'s actions in this and previous lives affect their future experiences and rebirths.', 11,
        [{ text: 'A type of prayer', isCorrect: false }, { text: 'A sacred text', isCorrect: false }, { text: 'The principle that actions affect future experiences', isCorrect: true }, { text: 'A religious holiday', isCorrect: false }]);
      addQ(wr, 'What is a mosque?', 15, 800,
        'A mosque is an Islamic place of worship where Muslims gather for communal prayers.', 12,
        [{ text: 'A Christian church', isCorrect: false }, { text: 'An Islamic place of worship', isCorrect: true }, { text: 'A Buddhist temple', isCorrect: false }, { text: 'A Jewish synagogue', isCorrect: false }]);
      addQ(wr, 'What is the Torah?', 20, 1000,
        'The Torah is the central reference of the Jewish religious tradition, consisting of the first five books of the Hebrew Bible.', 13,
        [{ text: 'The holy book of Islam', isCorrect: false }, { text: 'A Buddhist scripture', isCorrect: false }, { text: 'The central text of the Jewish tradition', isCorrect: true }, { text: 'A Hindu prayer book', isCorrect: false }]);
      addQ(wr, 'What is meditation in Buddhism?', 20, 1000,
        'Meditation in Buddhism is a practice of focused attention and mindfulness to achieve mental clarity, calm, and spiritual insight.', 14,
        [{ text: 'A form of physical exercise', isCorrect: false }, { text: 'A practice of focused attention for mental clarity and calm', isCorrect: true }, { text: 'A type of prayer to God', isCorrect: false }, { text: 'A ritual involving candles', isCorrect: false }]);
    }
  });

  seedAll();
  console.log('Upgrade D: added 9 questions each to Animal Kingdom, Food & Nutrition, Music & Arts, World Religions.');
}
