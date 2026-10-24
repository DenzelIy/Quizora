import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedContentPacks() {
  const db = getDb();

  const existing = db.prepare('SELECT COUNT(*) as count FROM content_packs').get() as { count: number };
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
    packId: string,
    chapterId: string | null,
    type: string,
    text: string,
    timeLimit: number,
    points: number,
    explanation: string,
    topic: string,
    difficulty: string,
    orderIndex: number,
    mathNotation: number,
    answers: { text: string; correct: boolean }[]
  ) => {
    const qId = randomUUID();
    insertQuestion.run(qId, packId, chapterId, type, text, timeLimit, points, explanation, topic, difficulty, orderIndex, mathNotation);
    answers.forEach((a, i) => insertAnswer.run(randomUUID(), qId, a.text, a.correct ? 1 : 0, i));
    return qId;
  };

  const seedAll = db.transaction(() => {
    // =========================================================
    // CULTURE PACK 1: The Tortoise and the Birds
    // =========================================================
    const cp1 = randomUUID();
    insertPack.run(cp1, 'tortoise-and-birds', 'The Tortoise and the Birds',
      'A classic West African folktale about why the tortoise has a cracked shell. This story teaches about the consequences of greed and deception.',
      'culture', 'Folklore', JSON.stringify(['folktale', 'igbo', 'moral-lesson', 'animals']),
      'beginner', 'Primary 3-5', null, 'Traditional West African Folktale', 'Oral tradition (public domain)',
      'public-domain', 1, 'active', 'narrative', 20, 5);

    insertObjective.run(randomUUID(), cp1, 'Understand the moral lesson about greed and deception', 0);
    insertObjective.run(randomUUID(), cp1, 'Identify key characters and their motivations', 1);
    insertObjective.run(randomUUID(), cp1, 'Recognize common themes in West African folklore', 2);

    const ch1_1 = randomUUID();
    insertChapter.run(ch1_1, cp1, 'Introduction',
      'Setting the scene for the folktale',
      'Long ago, there was a great famine across the land. All the animals were hungry and struggling to find food. Among them was the clever but greedy Tortoise, known throughout the animal kingdom for his cunning ways.',
      0, 'intro');

    const ch1_2 = randomUUID();
    insertChapter.run(ch1_2, cp1, 'The Feast in the Sky',
      'How the birds received an invitation',
      'One day, the birds received an invitation to a grand feast in the sky, hosted by the Sky People. The birds were excited, but Tortoise saw an opportunity. He went to each bird and begged them to lend him a feather so he could fly to the feast with them. The kind-hearted birds each gave him a feather, and Tortoise fashioned himself a pair of wings.',
      1, 'content');

    const ch1_3 = randomUUID();
    insertChapter.run(ch1_3, cp1, 'Tortoise\'s Trick',
      'How Tortoise deceived the birds',
      'On the way to the feast, Tortoise told the birds that it was customary for everyone to take a new name for the celebration. He chose the name "All of You." When the Sky People presented the feast and said "This food is for all of you," Tortoise claimed all the food for himself, as that was his chosen name. The birds watched in anger as Tortoise ate most of the feast.',
      2, 'content');

    const ch1_4 = randomUUID();
    insertChapter.run(ch1_4, cp1, 'The Fall',
      'How Tortoise got his cracked shell',
      'Furious at being tricked, each bird took back their feather, leaving Tortoise stranded in the sky with no way to get down. He asked Parrot to tell his wife to bring out all the soft things in the house. But Parrot, still angry, told Tortoise\'s wife to bring out all the hard things instead. When Tortoise jumped, he landed on stones, hoes, and machetes. His shell cracked into many pieces. A medicine man glued the pieces back together, which is why, to this day, the tortoise has a rough, patchy shell.',
      3, 'content');

    const ch1_5 = randomUUID();
    insertChapter.run(ch1_5, cp1, 'What We Learn',
      'The moral of the story',
      'This folktale teaches us that greed and deception always have consequences. Tortoise\'s cleverness was wasted because he used it selfishly. The story reminds us to be honest and to share with others, as trickery may bring short-term gain but leads to lasting harm.',
      4, 'summary');

    const q1_1 = addQ(cp1, ch1_2, 'multiple-choice', 'Why did the birds agree to give Tortoise their feathers?', 20, 1000,
      'The birds were kind-hearted and felt sorry for Tortoise because there was a famine.', 'Character motivation', 'easy', 0, 0, [
        { text: 'Tortoise threatened them', correct: false },
        { text: 'They were kind-hearted and he begged them', correct: true },
        { text: 'The Sky People told them to', correct: false },
        { text: 'Tortoise paid them with food', correct: false },
      ]);

    const q1_2 = addQ(cp1, ch1_3, 'multiple-choice', 'What name did Tortoise choose for the feast?', 15, 800,
      'Tortoise chose the name "All of You" so he could claim the food when the hosts said it was for "all of you."', 'Plot details', 'easy', 1, 0, [
        { text: 'King of Animals', correct: false },
        { text: 'All of You', correct: true },
        { text: 'Chief Guest', correct: false },
        { text: 'Sky Visitor', correct: false },
      ]);

    addQ(cp1, ch1_4, 'true-false', 'Parrot faithfully delivered Tortoise\'s message to his wife.', 15, 800,
      'Parrot changed the message out of anger — he told Tortoise\'s wife to bring out hard things instead of soft things.', 'Plot comprehension', 'easy', 2, 0, [
        { text: 'True', correct: false },
        { text: 'False', correct: true },
      ]);

    addQ(cp1, ch1_4, 'multiple-choice', 'Why does the tortoise have a cracked shell according to this story?', 20, 1000,
      'Tortoise fell from the sky and landed on hard objects because Parrot changed his message.', 'Theme and outcome', 'medium', 3, 0, [
        { text: 'He was born that way', correct: false },
        { text: 'A medicine man cracked it to heal him', correct: false },
        { text: 'He fell from the sky onto hard objects', correct: true },
        { text: 'The Sky People punished him', correct: false },
      ]);

    addQ(cp1, ch1_5, 'multiple-choice', 'What is the main moral of this story?', 20, 1000,
      'The story teaches that greed and deception lead to consequences, and it is better to be honest and share.', 'Moral lesson', 'medium', 4, 0, [
        { text: 'Flying is dangerous', correct: false },
        { text: 'Never trust birds', correct: false },
        { text: 'Greed and deception bring consequences', correct: true },
        { text: 'Always carry your own feathers', correct: false },
      ]);

    // Scenes for Griot Mode
    insertScene.run(randomUUID(), cp1, 'The Great Famine', 'Gather close, children, and hear the tale of Tortoise — the cleverest, yet most foolish creature in the land. In those days, a terrible famine gripped the earth. Every belly was empty, every pot was dry.', 'serious', 0, null);
    insertScene.run(randomUUID(), cp1, 'An Invitation', 'But then — wonderful news arrived! The birds received an invitation to a grand feast, high up in the sky! The Sky People were hosting, and there would be food — so much food!', 'excited', 1, null);
    insertScene.run(randomUUID(), cp1, 'Tortoise Begs', 'Now, Tortoise heard about this feast and his stomach growled louder than a lion. He went to each bird, one by one, bowing low: "Please, kind friend, lend me just one feather so I may fly with you."', 'thinking', 2, q1_1);
    insertScene.run(randomUUID(), cp1, 'The Trick', 'On the journey upward, Tortoise said: "It is the custom to take a new name for a sky feast." And guess what name he chose? "All of You." Ha! The cunning creature...', 'happy', 3, q1_2);
    insertScene.run(randomUUID(), cp1, 'The Fall', 'The birds took back their feathers. Tortoise fell — down, down, down — CRASH! Onto stones, onto iron, onto machetes! His shell shattered into a hundred pieces!', 'serious', 4, null);
    insertScene.run(randomUUID(), cp1, 'The Lesson', 'And that, dear ones, is why the tortoise carries a cracked and patchy shell to this day. Remember: cleverness used for greed will always find you out.', 'neutral', 5, null);


    // =========================================================
    // CULTURE PACK 2: Nigerian Independence
    // =========================================================
    const cp2 = randomUUID();
    insertPack.run(cp2, 'nigerian-independence', 'Nigeria\'s Path to Independence',
      'Learn about the key events and figures in Nigeria\'s journey to independence on October 1, 1960.',
      'culture', 'Nigerian History', JSON.stringify(['history', 'nigeria', 'independence', 'civic-education']),
      'intermediate', 'JSS 1-3', null, 'Educational summary', 'Historical records (public domain)',
      'public-domain', 1, 'active', 'standard', 15, 6);

    insertObjective.run(randomUUID(), cp2, 'Know the date Nigeria gained independence and from which colonial power', 0);
    insertObjective.run(randomUUID(), cp2, 'Identify key figures in the independence movement', 1);
    insertObjective.run(randomUUID(), cp2, 'Understand the significance of national symbols', 2);

    const ch2_1 = randomUUID();
    insertChapter.run(ch2_1, cp2, 'Colonial Era',
      'Nigeria under British rule',
      'Nigeria was a British colony from 1914 when the Northern and Southern protectorates were amalgamated by Lord Lugard. Colonial rule brought changes but also restricted Nigerian self-governance. By the 1940s, Nigerian leaders began organizing for independence.',
      0, 'intro');

    const ch2_2 = randomUUID();
    insertChapter.run(ch2_2, cp2, 'Road to Freedom',
      'The independence movement',
      'Key figures like Nnamdi Azikiwe, Obafemi Awolowo, and Ahmadu Bello led political parties that pushed for independence. The Macpherson Constitution of 1951 and the Lyttleton Constitution of 1954 gradually increased Nigerian participation in governance. By 1957, the Eastern and Western regions had achieved self-governance.',
      1, 'content');

    const ch2_3 = randomUUID();
    insertChapter.run(ch2_3, cp2, 'Independence Day',
      'October 1, 1960',
      'On October 1, 1960, Nigeria officially became independent. Sir Abubakar Tafawa Balewa became the first Prime Minister, while Nnamdi Azikiwe became the Governor-General (and later the first President of the Republic in 1963). The green-white-green flag was raised for the first time, designed by Michael Taiwo Akinkunmi, a student at the time.',
      2, 'content');

    addQ(cp2, ch2_1, 'multiple-choice', 'In what year were the Northern and Southern protectorates of Nigeria amalgamated?', 20, 1000,
      'Lord Lugard amalgamated the Northern and Southern protectorates in 1914.', 'Colonial history', 'medium', 0, 0, [
        { text: '1900', correct: false },
        { text: '1914', correct: true },
        { text: '1922', correct: false },
        { text: '1946', correct: false },
      ]);

    addQ(cp2, ch2_2, 'multiple-choice', 'Which of the following was a key leader in the Nigerian independence movement?', 20, 1000,
      'Nnamdi Azikiwe, Obafemi Awolowo, and Ahmadu Bello were all prominent leaders.', 'Independence leaders', 'easy', 1, 0, [
        { text: 'Lord Lugard', correct: false },
        { text: 'Nnamdi Azikiwe', correct: true },
        { text: 'Queen Victoria', correct: false },
        { text: 'Cecil Rhodes', correct: false },
      ]);

    addQ(cp2, ch2_3, 'multiple-choice', 'On what date did Nigeria gain independence?', 15, 800,
      'Nigeria gained independence on October 1, 1960.', 'Key dates', 'easy', 2, 0, [
        { text: 'January 1, 1960', correct: false },
        { text: 'October 1, 1960', correct: true },
        { text: 'October 1, 1963', correct: false },
        { text: 'June 12, 1993', correct: false },
      ]);

    addQ(cp2, ch2_3, 'multiple-choice', 'Who was Nigeria\'s first Prime Minister?', 20, 1000,
      'Sir Abubakar Tafawa Balewa served as the first Prime Minister of independent Nigeria.', 'Independence leaders', 'medium', 3, 0, [
        { text: 'Nnamdi Azikiwe', correct: false },
        { text: 'Obafemi Awolowo', correct: false },
        { text: 'Abubakar Tafawa Balewa', correct: true },
        { text: 'Ahmadu Bello', correct: false },
      ]);

    addQ(cp2, ch2_3, 'multiple-choice', 'Who designed the Nigerian national flag?', 20, 1000,
      'Michael Taiwo Akinkunmi, a student at the time, designed the green-white-green flag.', 'National symbols', 'medium', 4, 0, [
        { text: 'Nnamdi Azikiwe', correct: false },
        { text: 'Michael Taiwo Akinkunmi', correct: true },
        { text: 'Obafemi Awolowo', correct: false },
        { text: 'Lord Lugard', correct: false },
      ]);

    addQ(cp2, ch2_3, 'true-false', 'Nigeria became a Republic in 1960.', 15, 800,
      'Nigeria became a Republic in 1963, three years after independence. In 1960, it was still a constitutional monarchy with the British monarch as head of state.', 'Constitutional history', 'hard', 5, 0, [
        { text: 'True', correct: false },
        { text: 'False', correct: true },
      ]);


    // =========================================================
    // STEM PACK 1: Basic Mathematics
    // =========================================================
    const sp1 = randomUUID();
    insertPack.run(sp1, 'basic-maths-fractions', 'Fractions and Decimals',
      'Practice working with fractions, decimals, and percentages. Covers conversion, operations, and word problems aligned with the primary mathematics curriculum.',
      'stem', 'Mathematics', JSON.stringify(['fractions', 'decimals', 'percentages', 'arithmetic']),
      'beginner', 'Primary 5-6', 'NERDC-aligned', 'Educational content', 'Original educational content',
      'original', 1, 'active', 'standard', 15, 6);

    insertObjective.run(randomUUID(), sp1, 'Convert between fractions, decimals, and percentages', 0);
    insertObjective.run(randomUUID(), sp1, 'Perform basic operations with fractions', 1);
    insertObjective.run(randomUUID(), sp1, 'Solve word problems involving fractions and decimals', 2);

    addQ(sp1, null, 'multiple-choice', 'What is $\\frac{3}{4}$ expressed as a decimal?', 20, 1000,
      'To convert $\\frac{3}{4}$ to a decimal, divide 3 by 4: $3 \\div 4 = 0.75$', 'Fraction to decimal', 'easy', 0, 1, [
        { text: '$0.25$', correct: false },
        { text: '$0.34$', correct: false },
        { text: '$0.75$', correct: true },
        { text: '$1.33$', correct: false },
      ]);

    addQ(sp1, null, 'multiple-choice', 'What is $\\frac{1}{2} + \\frac{1}{4}$?', 25, 1000,
      'To add $\\frac{1}{2} + \\frac{1}{4}$, convert to a common denominator: $\\frac{2}{4} + \\frac{1}{4} = \\frac{3}{4}$', 'Adding fractions', 'easy', 1, 1, [
        { text: '$\\frac{2}{6}$', correct: false },
        { text: '$\\frac{1}{3}$', correct: false },
        { text: '$\\frac{3}{4}$', correct: true },
        { text: '$\\frac{2}{4}$', correct: false },
      ]);

    addQ(sp1, null, 'multiple-choice', 'What is $40\\%$ expressed as a fraction in its simplest form?', 20, 1000,
      '$40\\% = \\frac{40}{100} = \\frac{2}{5}$ (dividing both numerator and denominator by 20)', 'Percentage to fraction', 'medium', 2, 1, [
        { text: '$\\frac{4}{10}$', correct: false },
        { text: '$\\frac{2}{5}$', correct: true },
        { text: '$\\frac{1}{4}$', correct: false },
        { text: '$\\frac{40}{10}$', correct: false },
      ]);

    addQ(sp1, null, 'multiple-choice', 'If a student scores 18 out of 24 on a test, what percentage did they score?', 30, 1200,
      '$\\frac{18}{24} = \\frac{3}{4} = 0.75 = 75\\%$', 'Word problems', 'medium', 3, 1, [
        { text: '$60\\%$', correct: false },
        { text: '$72\\%$', correct: false },
        { text: '$75\\%$', correct: true },
        { text: '$80\\%$', correct: false },
      ]);

    addQ(sp1, null, 'multiple-choice', 'What is $\\frac{2}{3} \\times \\frac{3}{5}$?', 25, 1000,
      'Multiply numerators: $2 \\times 3 = 6$. Multiply denominators: $3 \\times 5 = 15$. Then simplify: $\\frac{6}{15} = \\frac{2}{5}$', 'Multiplying fractions', 'medium', 4, 1, [
        { text: '$\\frac{6}{8}$', correct: false },
        { text: '$\\frac{5}{8}$', correct: false },
        { text: '$\\frac{2}{5}$', correct: true },
        { text: '$\\frac{6}{15}$', correct: false },
      ]);

    addQ(sp1, null, 'true-false', '$0.5$ is greater than $\\frac{3}{4}$.', 15, 800,
      '$0.5 = \\frac{1}{2}$, and $\\frac{1}{2}$ (0.5) is less than $\\frac{3}{4}$ (0.75).', 'Comparing values', 'easy', 5, 1, [
        { text: 'True', correct: false },
        { text: 'False', correct: true },
      ]);


    // =========================================================
    // STEM PACK 2: Basic Science — Human Body
    // =========================================================
    const sp2 = randomUUID();
    insertPack.run(sp2, 'basic-science-human-body', 'The Human Body Systems',
      'Explore the major systems of the human body including the skeletal, circulatory, and respiratory systems.',
      'stem', 'Basic Science', JSON.stringify(['human-body', 'biology', 'anatomy', 'health']),
      'beginner', 'Primary 5 - JSS 1', 'NERDC-aligned', 'Educational content', 'Original educational content',
      'original', 1, 'active', 'standard', 15, 6);

    insertObjective.run(randomUUID(), sp2, 'Name the major systems of the human body', 0);
    insertObjective.run(randomUUID(), sp2, 'Describe the function of each body system', 1);
    insertObjective.run(randomUUID(), sp2, 'Identify key organs within each system', 2);

    const ch_s1 = randomUUID();
    insertChapter.run(ch_s1, sp2, 'The Skeletal System',
      'Bones and their functions',
      'The skeletal system provides structure, protects organs, and enables movement. An adult human has 206 bones. The skeleton is divided into the axial skeleton (skull, spine, ribs) and the appendicular skeleton (limbs, shoulders, pelvis).',
      0, 'content');

    const ch_s2 = randomUUID();
    insertChapter.run(ch_s2, sp2, 'The Circulatory System',
      'Heart, blood, and blood vessels',
      'The circulatory system transports oxygen, nutrients, and waste products throughout the body. The heart pumps blood through arteries (away from the heart) and veins (back to the heart). Red blood cells carry oxygen using a protein called haemoglobin.',
      1, 'content');

    addQ(sp2, ch_s1, 'multiple-choice', 'How many bones does an adult human body have?', 20, 1000,
      'An adult human has 206 bones. Babies are born with about 270 bones, but many fuse together as they grow.', 'Skeletal system', 'easy', 0, 0, [
        { text: '106', correct: false },
        { text: '206', correct: true },
        { text: '306', correct: false },
        { text: '186', correct: false },
      ]);

    addQ(sp2, ch_s1, 'multiple-choice', 'What is the main function of the skeletal system?', 20, 1000,
      'The skeletal system provides structure and support, protects internal organs, and works with muscles to enable movement.', 'Skeletal system', 'easy', 1, 0, [
        { text: 'Digesting food', correct: false },
        { text: 'Providing structure, protection, and enabling movement', correct: true },
        { text: 'Filtering blood', correct: false },
        { text: 'Producing hormones', correct: false },
      ]);

    addQ(sp2, ch_s2, 'multiple-choice', 'Which type of blood vessel carries blood away from the heart?', 20, 1000,
      'Arteries carry blood away from the heart. An easy way to remember: Arteries = Away.', 'Circulatory system', 'easy', 2, 0, [
        { text: 'Veins', correct: false },
        { text: 'Capillaries', correct: false },
        { text: 'Arteries', correct: true },
        { text: 'Lymph vessels', correct: false },
      ]);

    addQ(sp2, ch_s2, 'multiple-choice', 'What protein in red blood cells carries oxygen?', 25, 1000,
      'Haemoglobin is the iron-containing protein in red blood cells that binds to oxygen.', 'Circulatory system', 'medium', 3, 0, [
        { text: 'Keratin', correct: false },
        { text: 'Haemoglobin', correct: true },
        { text: 'Insulin', correct: false },
        { text: 'Collagen', correct: false },
      ]);

    addQ(sp2, null, 'true-false', 'The heart is part of the respiratory system.', 15, 800,
      'The heart is part of the circulatory system, not the respiratory system. The respiratory system includes the lungs, trachea, and bronchi.', 'Body systems', 'easy', 4, 0, [
        { text: 'True', correct: false },
        { text: 'False', correct: true },
      ]);

    addQ(sp2, ch_s2, 'multiple-choice', 'Which organ pumps blood throughout the body?', 15, 800,
      'The heart is a muscular organ that pumps blood through the circulatory system.', 'Circulatory system', 'easy', 5, 0, [
        { text: 'Lungs', correct: false },
        { text: 'Brain', correct: false },
        { text: 'Heart', correct: true },
        { text: 'Liver', correct: false },
      ]);
  });

  seedAll();
  console.log('Seeded 4 content packs (2 culture, 2 STEM).');
}
