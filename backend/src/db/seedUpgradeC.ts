import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedUpgradeC() {
  const db = getDb();

  const check = db.prepare(
    "SELECT COUNT(*) as count FROM questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.title = 'Nigerian Independence'"
  ).get() as { count: number };
  if (check.count > 10) return;

  const insertQuestion = db.prepare(
    'INSERT INTO questions (id, quiz_id, type, text, time_limit, points, explanation, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO answer_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );

  const findQuiz = db.prepare("SELECT id FROM quizzes WHERE title = ?");

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

  const getQuizId = (title: string): string | null => {
    const row = findQuiz.get(title) as { id: string } | undefined;
    return row?.id ?? null;
  };

  const seedAll = db.transaction(() => {
    // ─── Nigerian Independence ───
    const ni = getQuizId('Nigerian Independence');
    if (ni) {
      addQ(ni, "What was the name of Nigeria's independence anthem?", 20, 1000,
        '"Nigeria, We Hail Thee" was the national anthem from 1960 to 1978.', 6,
        [{ text: 'Nigeria, We Hail Thee', isCorrect: true }, { text: 'Arise, O Compatriots', isCorrect: false }, { text: 'God Bless Nigeria', isCorrect: false }, { text: 'One Nigeria', isCorrect: false }]);
      addQ(ni, 'Which region was the first to gain self-governance in Nigeria?', 20, 1000,
        'The Western Region gained self-governance in 1957 under Chief Obafemi Awolowo.', 7,
        [{ text: 'Western Region', isCorrect: true }, { text: 'Eastern Region', isCorrect: false }, { text: 'Northern Region', isCorrect: false }, { text: 'Mid-Western Region', isCorrect: false }]);
      addQ(ni, 'Who designed the Nigerian flag?', 15, 1000,
        'Michael Taiwo Akinkunmi designed the flag in 1959 as a student.', 8,
        [{ text: 'Michael Taiwo Akinkunmi', isCorrect: true }, { text: 'Nnamdi Azikiwe', isCorrect: false }, { text: 'Herbert Macaulay', isCorrect: false }, { text: 'Obafemi Awolowo', isCorrect: false }]);
      addQ(ni, 'What do the green stripes on the Nigerian flag represent?', 20, 1000,
        'The green stripes represent Nigeria\'s forests and abundant natural wealth and agriculture.', 9,
        [{ text: 'Forests and agriculture', isCorrect: true }, { text: 'Islam and Christianity', isCorrect: false }, { text: 'Rivers and lakes', isCorrect: false }, { text: 'Military and police', isCorrect: false }]);
      addQ(ni, 'Who was the first military Head of State of Nigeria?', 20, 1000,
        'General Johnson Aguiyi-Ironsi became Head of State after the January 1966 coup.', 10,
        [{ text: 'General Aguiyi-Ironsi', isCorrect: true }, { text: 'General Yakubu Gowon', isCorrect: false }, { text: 'General Murtala Mohammed', isCorrect: false }, { text: 'General Ibrahim Babangida', isCorrect: false }]);
      addQ(ni, 'What was the Nigerian civil war also known as?', 15, 1000,
        'The civil war (1967–1970) is also known as the Biafran War after the secessionist state of Biafra.', 11,
        [{ text: 'The Biafran War', isCorrect: true }, { text: 'The Niger War', isCorrect: false }, { text: 'The Lagos Conflict', isCorrect: false }, { text: 'The Federal War', isCorrect: false }]);
      addQ(ni, 'In what year did the Nigerian civil war end?', 15, 800,
        'The war ended on 15 January 1970 with Biafra\'s surrender.', 12,
        [{ text: '1970', isCorrect: true }, { text: '1968', isCorrect: false }, { text: '1972', isCorrect: false }, { text: '1975', isCorrect: false }]);
      addQ(ni, 'Who was the leader of Biafra during the civil war?', 20, 1000,
        'Chukwuemeka Odumegwu Ojukwu led the secessionist Republic of Biafra.', 13,
        [{ text: 'Chukwuemeka Odumegwu Ojukwu', isCorrect: true }, { text: 'Nnamdi Azikiwe', isCorrect: false }, { text: 'Yakubu Gowon', isCorrect: false }, { text: 'Alex Ekwueme', isCorrect: false }]);
      addQ(ni, "What was Nigeria's motto at independence?", 20, 1000,
        'The original motto was "Unity and Faith, Peace and Progress."', 14,
        [{ text: 'Unity and Faith, Peace and Progress', isCorrect: true }, { text: 'One Nation, One Destiny', isCorrect: false }, { text: 'Strength and Honour', isCorrect: false }, { text: 'Freedom, Justice, Unity', isCorrect: false }]);
    }

    // ─── Nigerian Culture & People ───
    const nc = getQuizId('Nigerian Culture & People');
    if (nc) {
      addQ(nc, 'What is the traditional Yoruba greeting for elders?', 15, 800,
        'Yoruba culture requires younger people to prostrate (males) or kneel (females) when greeting elders.', 6,
        [{ text: 'Prostrating or kneeling', isCorrect: true }, { text: 'Shaking hands firmly', isCorrect: false }, { text: 'Bowing from the waist', isCorrect: false }, { text: 'Clapping three times', isCorrect: false }]);
      addQ(nc, 'Which Nigerian festival is celebrated with masquerades in Lagos?', 20, 1000,
        'The Eyo Festival features white-clad masquerades parading through Lagos Island.', 7,
        [{ text: 'Eyo Festival', isCorrect: true }, { text: 'Osun-Osogbo Festival', isCorrect: false }, { text: 'Durbar Festival', isCorrect: false }, { text: 'New Yam Festival', isCorrect: false }]);
      addQ(nc, 'What is jollof rice?', 15, 800,
        'Jollof rice is a popular West African one-pot dish made with rice, tomatoes, onions, and spices.', 8,
        [{ text: 'A one-pot rice dish with tomatoes and spices', isCorrect: true }, { text: 'A type of fried plantain', isCorrect: false }, { text: 'A soup made with palm oil', isCorrect: false }, { text: 'A roasted yam dish', isCorrect: false }]);
      addQ(nc, 'What is "Nollywood"?', 15, 1000,
        'Nollywood is Nigeria\'s film industry, the second largest in the world by volume of films produced.', 9,
        [{ text: 'Nigeria\'s film industry', isCorrect: true }, { text: 'A music streaming platform', isCorrect: false }, { text: 'A Nigerian fashion brand', isCorrect: false }, { text: 'A TV broadcasting network', isCorrect: false }]);
      addQ(nc, 'What traditional cloth is associated with Yoruba culture?', 20, 1000,
        'Aso Oke is a hand-woven cloth worn on special occasions in Yoruba culture.', 10,
        [{ text: 'Aso Oke', isCorrect: true }, { text: 'Kente', isCorrect: false }, { text: 'Ankara', isCorrect: false }, { text: 'Adire', isCorrect: false }]);
      addQ(nc, 'Which Nigerian city is famous for its ancient bronze sculptures?', 20, 1200,
        'Benin City\'s bronze sculptures date back to the 13th century and are among Africa\'s most celebrated artworks.', 11,
        [{ text: 'Benin City', isCorrect: true }, { text: 'Calabar', isCorrect: false }, { text: 'Ibadan', isCorrect: false }, { text: 'Enugu', isCorrect: false }]);
      addQ(nc, 'What is the traditional Igbo title for a chief?', 20, 1000,
        'Igbo communities use titles like Obi or Igwe for their traditional rulers.', 12,
        [{ text: 'Obi or Igwe', isCorrect: true }, { text: 'Oba', isCorrect: false }, { text: 'Emir', isCorrect: false }, { text: 'Sultan', isCorrect: false }]);
      addQ(nc, 'What is suya?', 15, 800,
        'Suya is spiced, grilled skewered meat — a hugely popular Nigerian street food.', 13,
        [{ text: 'Spiced grilled meat on skewers', isCorrect: true }, { text: 'A fried dough snack', isCorrect: false }, { text: 'A bean-based porridge', isCorrect: false }, { text: 'A coconut dessert', isCorrect: false }]);
      addQ(nc, 'How many ethnic groups are estimated to exist in Nigeria?', 20, 1000,
        'Nigeria has over 250 ethnic groups, making it one of the most diverse countries in the world.', 14,
        [{ text: 'Over 250', isCorrect: true }, { text: 'About 50', isCorrect: false }, { text: 'Over 500', isCorrect: false }, { text: 'About 100', isCorrect: false }]);
    }

    // ─── African Geography ───
    const ag = getQuizId('African Geography');
    if (ag) {
      addQ(ag, 'What is the largest lake in Africa?', 15, 1000,
        'Lake Victoria is the largest lake in Africa and the second-largest freshwater lake in the world.', 6,
        [{ text: 'Lake Victoria', isCorrect: true }, { text: 'Lake Tanganyika', isCorrect: false }, { text: 'Lake Malawi', isCorrect: false }, { text: 'Lake Chad', isCorrect: false }]);
      addQ(ag, 'Which African country has the most pyramids?', 20, 1200,
        'Sudan has over 200 pyramids — more than Egypt, which has about 138.', 7,
        [{ text: 'Sudan', isCorrect: true }, { text: 'Egypt', isCorrect: false }, { text: 'Ethiopia', isCorrect: false }, { text: 'Libya', isCorrect: false }]);
      addQ(ag, 'What is the Great Rift Valley?', 20, 1000,
        'The Great Rift Valley is a massive geological fault system stretching from Lebanon to Mozambique through East Africa.', 8,
        [{ text: 'A geological fault system through East Africa', isCorrect: true }, { text: 'A river valley in West Africa', isCorrect: false }, { text: 'A mountain range in North Africa', isCorrect: false }, { text: 'A canyon in Southern Africa', isCorrect: false }]);
      addQ(ag, 'What is the capital of Kenya?', 15, 800,
        'Nairobi is the capital and largest city of Kenya.', 9,
        [{ text: 'Nairobi', isCorrect: true }, { text: 'Mombasa', isCorrect: false }, { text: 'Kisumu', isCorrect: false }, { text: 'Nakuru', isCorrect: false }]);
      addQ(ag, 'Which African river forms the border between Zambia and Zimbabwe?', 20, 1000,
        'The Zambezi River forms the natural border and is home to Victoria Falls.', 10,
        [{ text: 'Zambezi', isCorrect: true }, { text: 'Limpopo', isCorrect: false }, { text: 'Congo', isCorrect: false }, { text: 'Orange', isCorrect: false }]);
      addQ(ag, 'What is the smallest country in mainland Africa?', 20, 1000,
        'The Gambia is the smallest country on mainland Africa, surrounded on three sides by Senegal.', 11,
        [{ text: 'The Gambia', isCorrect: true }, { text: 'Eswatini', isCorrect: false }, { text: 'Lesotho', isCorrect: false }, { text: 'Djibouti', isCorrect: false }]);
      addQ(ag, 'Which desert is found in southern Africa?', 15, 800,
        'The Kalahari Desert covers parts of Botswana, Namibia, and South Africa.', 12,
        [{ text: 'Kalahari', isCorrect: true }, { text: 'Sahara', isCorrect: false }, { text: 'Namib', isCorrect: false }, { text: 'Libyan', isCorrect: false }]);
      addQ(ag, 'What strait separates Africa from Europe?', 15, 1000,
        'The Strait of Gibraltar separates Africa (Morocco) from Europe (Spain) by just 14.3 km.', 13,
        [{ text: 'Strait of Gibraltar', isCorrect: true }, { text: 'Strait of Hormuz', isCorrect: false }, { text: 'Suez Canal', isCorrect: false }, { text: 'Strait of Malacca', isCorrect: false }]);
      addQ(ag, 'Which country is known as the "Rainbow Nation"?', 15, 800,
        'South Africa is called the Rainbow Nation due to its cultural and ethnic diversity.', 14,
        [{ text: 'South Africa', isCorrect: true }, { text: 'Kenya', isCorrect: false }, { text: 'Nigeria', isCorrect: false }, { text: 'Tanzania', isCorrect: false }]);
    }

    // ─── World Geography ───
    const wg = getQuizId('World Geography');
    if (wg) {
      addQ(wg, 'What is the longest wall in the world?', 15, 1000,
        'The Great Wall of China stretches over 21,000 km including all branches.', 6,
        [{ text: 'Great Wall of China', isCorrect: true }, { text: 'Hadrian\'s Wall', isCorrect: false }, { text: 'Berlin Wall', isCorrect: false }, { text: 'Western Wall', isCorrect: false }]);
      addQ(wg, 'Which country has the most islands?', 20, 1200,
        'Sweden has over 267,000 islands, more than any other country.', 7,
        [{ text: 'Sweden', isCorrect: true }, { text: 'Indonesia', isCorrect: false }, { text: 'Philippines', isCorrect: false }, { text: 'Finland', isCorrect: false }]);
      addQ(wg, 'What is the deepest ocean trench?', 15, 1000,
        'The Mariana Trench in the Pacific Ocean is nearly 11,000 metres deep.', 8,
        [{ text: 'Mariana Trench', isCorrect: true }, { text: 'Tonga Trench', isCorrect: false }, { text: 'Java Trench', isCorrect: false }, { text: 'Puerto Rico Trench', isCorrect: false }]);
      addQ(wg, 'What river flows through Paris?', 15, 800,
        'The Seine flows through Paris and is about 777 km long.', 9,
        [{ text: 'Seine', isCorrect: true }, { text: 'Loire', isCorrect: false }, { text: 'Rhine', isCorrect: false }, { text: 'Danube', isCorrect: false }]);
      addQ(wg, 'Which country spans the most time zones?', 20, 1000,
        'France spans 12 time zones, mostly due to its overseas territories.', 10,
        [{ text: 'France', isCorrect: true }, { text: 'Russia', isCorrect: false }, { text: 'United States', isCorrect: false }, { text: 'United Kingdom', isCorrect: false }]);
      addQ(wg, 'What is the tallest building in the world as of 2024?', 15, 1000,
        'The Burj Khalifa in Dubai stands at 828 metres tall.', 11,
        [{ text: 'Burj Khalifa', isCorrect: true }, { text: 'Shanghai Tower', isCorrect: false }, { text: 'One World Trade Center', isCorrect: false }, { text: 'Taipei 101', isCorrect: false }]);
      addQ(wg, 'Which continent is the driest?', 20, 1000,
        'Antarctica is technically the driest continent, receiving very little precipitation.', 12,
        [{ text: 'Antarctica', isCorrect: true }, { text: 'Africa', isCorrect: false }, { text: 'Australia', isCorrect: false }, { text: 'Asia', isCorrect: false }]);
      addQ(wg, 'What is the capital of Brazil?', 15, 800,
        'Brasília has been the capital since 1960, not Rio de Janeiro.', 13,
        [{ text: 'Brasília', isCorrect: true }, { text: 'Rio de Janeiro', isCorrect: false }, { text: 'São Paulo', isCorrect: false }, { text: 'Salvador', isCorrect: false }]);
      addQ(wg, 'Which two countries share the longest international border?', 20, 1000,
        'The Canada–USA border is about 8,891 km long, the longest in the world.', 14,
        [{ text: 'Canada and USA', isCorrect: true }, { text: 'Russia and China', isCorrect: false }, { text: 'Brazil and Argentina', isCorrect: false }, { text: 'India and China', isCorrect: false }]);
    }

    // ─── Computer Basics ───
    const cb = getQuizId('Computer Basics');
    if (cb) {
      addQ(cb, 'What is an operating system?', 20, 1000,
        'An operating system (e.g. Windows, macOS, Linux) is software that manages computer hardware and provides services for programs.', 6,
        [{ text: 'Software that manages hardware and runs programs', isCorrect: true }, { text: 'A type of keyboard', isCorrect: false }, { text: 'A programming language', isCorrect: false }, { text: 'An internet browser', isCorrect: false }]);
      addQ(cb, 'What does GPU stand for?', 15, 1000,
        'GPU = Graphics Processing Unit, responsible for rendering images and video.', 7,
        [{ text: 'Graphics Processing Unit', isCorrect: true }, { text: 'General Purpose Unit', isCorrect: false }, { text: 'Global Processing Utility', isCorrect: false }, { text: 'Graphics Power Utility', isCorrect: false }]);
      addQ(cb, 'What is the function of a hard drive?', 15, 800,
        'A hard drive stores data permanently, even when the computer is turned off.', 8,
        [{ text: 'Long-term data storage', isCorrect: true }, { text: 'Processing calculations', isCorrect: false }, { text: 'Displaying images', isCorrect: false }, { text: 'Connecting to the internet', isCorrect: false }]);
      addQ(cb, 'Which language is most used for creating web pages?', 20, 1000,
        'HTML structures web pages, and JavaScript adds interactivity — together they power the web.', 9,
        [{ text: 'HTML and JavaScript', isCorrect: true }, { text: 'Python', isCorrect: false }, { text: 'C++', isCorrect: false }, { text: 'Swift', isCorrect: false }]);
      addQ(cb, 'How many bits are in a byte?', 15, 800,
        'A byte consists of 8 bits. Each bit is a 0 or 1.', 10,
        [{ text: '8', isCorrect: true }, { text: '4', isCorrect: false }, { text: '16', isCorrect: false }, { text: '2', isCorrect: false }]);
      addQ(cb, 'What does USB stand for?', 15, 1000,
        'USB = Universal Serial Bus, a standard for connecting devices.', 11,
        [{ text: 'Universal Serial Bus', isCorrect: true }, { text: 'Unified System Bridge', isCorrect: false }, { text: 'Ultra Speed Bandwidth', isCorrect: false }, { text: 'Universal Software Base', isCorrect: false }]);
      addQ(cb, 'What is the difference between hardware and software?', 20, 1000,
        'Hardware is the physical components (keyboard, screen). Software is the programs and instructions.', 12,
        [{ text: 'Hardware is physical, software is programs', isCorrect: true }, { text: 'They are the same thing', isCorrect: false }, { text: 'Hardware is for gaming, software is for work', isCorrect: false }, { text: 'Software is physical, hardware is programs', isCorrect: false }]);
      addQ(cb, 'What is an algorithm?', 20, 1000,
        'An algorithm is a step-by-step set of instructions designed to solve a specific problem.', 13,
        [{ text: 'A step-by-step set of instructions to solve a problem', isCorrect: true }, { text: 'A type of computer virus', isCorrect: false }, { text: 'A brand of computer', isCorrect: false }, { text: 'A social media platform', isCorrect: false }]);
      addQ(cb, 'What does Wi-Fi stand for?', 15, 800,
        'Wi-Fi stands for Wireless Fidelity, a technology for wireless local area networking.', 14,
        [{ text: 'Wireless Fidelity', isCorrect: true }, { text: 'Wired Frequency', isCorrect: false }, { text: 'Wide Finder', isCorrect: false }, { text: 'Web Interface', isCorrect: false }]);
    }

    // ─── Internet & Digital Safety ───
    const ids = getQuizId('Internet & Digital Safety');
    if (ids) {
      addQ(ids, 'What is a firewall?', 20, 1000,
        'A firewall is a network security system that monitors and controls incoming and outgoing traffic.', 6,
        [{ text: 'A security system that controls network traffic', isCorrect: true }, { text: 'A type of computer virus', isCorrect: false }, { text: 'A web browser', isCorrect: false }, { text: 'A physical wall around servers', isCorrect: false }]);
      addQ(ids, 'What does VPN stand for?', 15, 1000,
        'VPN = Virtual Private Network, which encrypts your internet connection for privacy.', 7,
        [{ text: 'Virtual Private Network', isCorrect: true }, { text: 'Very Protected Network', isCorrect: false }, { text: 'Visual Processing Node', isCorrect: false }, { text: 'Verified Public Network', isCorrect: false }]);
      addQ(ids, 'What is two-factor authentication (2FA)?', 20, 1200,
        '2FA requires two forms of verification (e.g. password + SMS code) for extra security.', 8,
        [{ text: 'A method requiring two forms of verification', isCorrect: true }, { text: 'Using two different passwords', isCorrect: false }, { text: 'Logging in from two devices', isCorrect: false }, { text: 'Having two email accounts', isCorrect: false }]);
      addQ(ids, 'What is malware?', 15, 1000,
        'Malware (malicious software) includes viruses, worms, trojans, and ransomware designed to harm systems.', 9,
        [{ text: 'Malicious software designed to harm computers', isCorrect: true }, { text: 'A type of helpful software update', isCorrect: false }, { text: 'An internet speed booster', isCorrect: false }, { text: 'A computer repair tool', isCorrect: false }]);
      addQ(ids, 'What is a cookie in web browsing?', 20, 1000,
        'A cookie is a small data file stored by websites on your device to remember preferences and track visits.', 10,
        [{ text: 'A small data file stored by websites', isCorrect: true }, { text: 'A type of computer virus', isCorrect: false }, { text: 'A browser plugin', isCorrect: false }, { text: 'An email attachment', isCorrect: false }]);
      addQ(ids, 'What is cyberbullying?', 15, 800,
        'Cyberbullying is using digital devices and platforms to harass, threaten, or humiliate someone.', 11,
        [{ text: 'Using digital devices to harass someone', isCorrect: true }, { text: 'Hacking into computer systems', isCorrect: false }, { text: 'Sending spam emails', isCorrect: false }, { text: 'Playing online games excessively', isCorrect: false }]);
      addQ(ids, 'What should you do if you receive a suspicious email?', 20, 1000,
        'Never click links in suspicious emails. Report the email and delete it.', 12,
        [{ text: 'Don\'t click links; report it and delete it', isCorrect: true }, { text: 'Open it to check if it\'s real', isCorrect: false }, { text: 'Forward it to all your contacts', isCorrect: false }, { text: 'Reply asking who sent it', isCorrect: false }]);
      addQ(ids, 'What is a digital footprint?', 20, 1000,
        'Your digital footprint is the trail of data you create while using the internet — posts, searches, purchases.', 13,
        [{ text: 'The trail of data you leave online', isCorrect: true }, { text: 'A type of computer hardware', isCorrect: false }, { text: 'Your computer\'s serial number', isCorrect: false }, { text: 'A measurement of internet speed', isCorrect: false }]);
      addQ(ids, 'What is encryption?', 20, 1200,
        'Encryption converts data into a code so only authorized parties can read it.', 14,
        [{ text: 'Converting data into code to prevent unauthorized access', isCorrect: true }, { text: 'Deleting files permanently', isCorrect: false }, { text: 'Compressing files to save space', isCorrect: false }, { text: 'Backing up data to the cloud', isCorrect: false }]);
    }

    // ─── Nigerian Government ───
    const ng = getQuizId('Nigerian Government');
    if (ng) {
      addQ(ng, 'What is the highest court in Nigeria?', 15, 1000,
        'The Supreme Court of Nigeria is the final court of appeal.', 6,
        [{ text: 'Supreme Court', isCorrect: true }, { text: 'Court of Appeal', isCorrect: false }, { text: 'High Court', isCorrect: false }, { text: 'Federal Court', isCorrect: false }]);
      addQ(ng, 'How many members are in the House of Representatives?', 15, 1000,
        'The House of Representatives has 360 members, each representing a federal constituency.', 7,
        [{ text: '360', isCorrect: true }, { text: '109', isCorrect: false }, { text: '250', isCorrect: false }, { text: '500', isCorrect: false }]);
      addQ(ng, 'What document is the supreme law of Nigeria?', 15, 800,
        'The Constitution is the supreme law; any law inconsistent with it is void.', 8,
        [{ text: 'The Constitution', isCorrect: true }, { text: 'The National Anthem', isCorrect: false }, { text: 'The Electoral Act', isCorrect: false }, { text: 'The Criminal Code', isCorrect: false }]);
      addQ(ng, 'What is the tenure of a Nigerian president?', 15, 1000,
        'A president serves a 4-year term and can be re-elected for a maximum of 2 terms.', 9,
        [{ text: '4 years, maximum 2 terms', isCorrect: true }, { text: '5 years, maximum 2 terms', isCorrect: false }, { text: '4 years, no term limit', isCorrect: false }, { text: '6 years, maximum 1 term', isCorrect: false }]);
      addQ(ng, 'What is INEC?', 20, 1000,
        'INEC (Independent National Electoral Commission) is the body responsible for conducting elections in Nigeria.', 10,
        [{ text: 'Independent National Electoral Commission', isCorrect: true }, { text: 'International Network for Education Council', isCorrect: false }, { text: 'Internal National Economic Committee', isCorrect: false }, { text: 'Institute of National Emergency Control', isCorrect: false }]);
      addQ(ng, 'What are the 3 tiers of government in Nigeria?', 15, 800,
        'Nigeria has Federal, State, and Local government tiers.', 11,
        [{ text: 'Federal, State, Local', isCorrect: true }, { text: 'National, Regional, District', isCorrect: false }, { text: 'Central, Provincial, Municipal', isCorrect: false }, { text: 'Executive, Legislative, Judicial', isCorrect: false }]);
      addQ(ng, 'Who is the head of the judiciary in Nigeria?', 20, 1000,
        'The Chief Justice of Nigeria heads the judicial arm of government.', 12,
        [{ text: 'Chief Justice of Nigeria', isCorrect: true }, { text: 'Attorney General', isCorrect: false }, { text: 'Senate President', isCorrect: false }, { text: 'Inspector General', isCorrect: false }]);
      addQ(ng, 'What is the primary function of the legislature?', 15, 800,
        'The legislature\'s primary function is to make laws for the peace, order, and good governance of the country.', 13,
        [{ text: 'To make laws', isCorrect: true }, { text: 'To enforce laws', isCorrect: false }, { text: 'To interpret laws', isCorrect: false }, { text: 'To arrest criminals', isCorrect: false }]);
      addQ(ng, 'At what level of government are governors found?', 15, 800,
        'Governors head the executive branch at the state level in Nigeria.', 14,
        [{ text: 'State level', isCorrect: true }, { text: 'Federal level', isCorrect: false }, { text: 'Local level', isCorrect: false }, { text: 'Ward level', isCorrect: false }]);
    }

    // ─── African Literature ───
    const al = getQuizId('African Literature');
    if (al) {
      addQ(al, 'Who wrote "The Famished Road"?', 15, 1000,
        'Ben Okri won the 1991 Booker Prize for "The Famished Road."', 6,
        [{ text: 'Ben Okri', isCorrect: true }, { text: 'Chinua Achebe', isCorrect: false }, { text: 'Wole Soyinka', isCorrect: false }, { text: 'Cyprian Ekwensi', isCorrect: false }]);
      addQ(al, 'What language does Ngugi wa Thiong\'o advocate writing in?', 20, 1200,
        'Ngugi advocates writing in African languages — he writes primarily in Gikuyu and Swahili.', 7,
        [{ text: 'African languages, specifically Gikuyu', isCorrect: true }, { text: 'English only', isCorrect: false }, { text: 'French and Arabic', isCorrect: false }, { text: 'Latin', isCorrect: false }]);
      addQ(al, 'Who wrote "Half of a Yellow Sun"?', 15, 1000,
        'Chimamanda Ngozi Adichie\'s "Half of a Yellow Sun" is set during the Nigerian civil war.', 8,
        [{ text: 'Chimamanda Ngozi Adichie', isCorrect: true }, { text: 'Buchi Emecheta', isCorrect: false }, { text: 'Flora Nwapa', isCorrect: false }, { text: 'Chinua Achebe', isCorrect: false }]);
      addQ(al, 'What is the main theme of "Things Fall Apart"?', 20, 1000,
        'The novel explores the clash between traditional Igbo culture and the forces of European colonialism.', 9,
        [{ text: 'Clash between Igbo culture and colonialism', isCorrect: true }, { text: 'A love story in modern Lagos', isCorrect: false }, { text: 'The Nigerian civil war', isCorrect: false }, { text: 'Life in ancient Egypt', isCorrect: false }]);
      addQ(al, 'Who wrote "Petals of Blood"?', 20, 1000,
        'Ngugi wa Thiong\'o published "Petals of Blood" in 1977, a critique of post-independence Kenya.', 10,
        [{ text: 'Ngugi wa Thiong\'o', isCorrect: true }, { text: 'Chinua Achebe', isCorrect: false }, { text: 'Ayi Kwei Armah', isCorrect: false }, { text: 'Ousmane Sembène', isCorrect: false }]);
      addQ(al, 'What is oral literature?', 15, 800,
        'Oral literature includes stories, poems, proverbs, and songs passed down by word of mouth across generations.', 11,
        [{ text: 'Stories and poems passed down by word of mouth', isCorrect: true }, { text: 'Books written in African languages', isCorrect: false }, { text: 'Literature published online', isCorrect: false }, { text: 'Audiobook recordings', isCorrect: false }]);
      addQ(al, 'Who is considered the "mother of modern African literature" in Nigeria?', 25, 1200,
        'Flora Nwapa\'s "Efuru" (1966) made her the first internationally published Nigerian woman novelist.', 12,
        [{ text: 'Flora Nwapa', isCorrect: true }, { text: 'Buchi Emecheta', isCorrect: false }, { text: 'Chimamanda Adichie', isCorrect: false }, { text: 'Ama Ata Aidoo', isCorrect: false }]);
      addQ(al, 'What genre is "The Palm-Wine Drinkard" by Amos Tutuola?', 20, 1000,
        '"The Palm-Wine Drinkard" (1952) is a fantasy/folklore novel rooted in Yoruba mythology.', 13,
        [{ text: 'Fantasy / folklore novel', isCorrect: true }, { text: 'Historical biography', isCorrect: false }, { text: 'Science fiction', isCorrect: false }, { text: 'Political thriller', isCorrect: false }]);
      addQ(al, 'Who wrote "Americanah"?', 15, 1000,
        'Chimamanda Ngozi Adichie\'s "Americanah" (2013) explores race, identity, and immigration.', 14,
        [{ text: 'Chimamanda Ngozi Adichie', isCorrect: true }, { text: 'Teju Cole', isCorrect: false }, { text: 'Sefi Atta', isCorrect: false }, { text: 'Helon Habila', isCorrect: false }]);
    }

    // ─── Sports Trivia ───
    const st = getQuizId('Sports Trivia');
    if (st) {
      addQ(st, 'What sport is played at Wimbledon?', 15, 800,
        'Wimbledon is the oldest tennis tournament in the world, held annually in London since 1877.', 6,
        [{ text: 'Tennis', isCorrect: true }, { text: 'Cricket', isCorrect: false }, { text: 'Golf', isCorrect: false }, { text: 'Rugby', isCorrect: false }]);
      addQ(st, 'How many players are on a basketball team on the court?', 15, 800,
        'Each basketball team has 5 players on the court at a time.', 7,
        [{ text: '5', isCorrect: true }, { text: '6', isCorrect: false }, { text: '7', isCorrect: false }, { text: '4', isCorrect: false }]);
      addQ(st, 'Which country has won the most FIFA World Cups?', 20, 1000,
        'Brazil has won 5 FIFA World Cups (1958, 1962, 1970, 1994, 2002).', 8,
        [{ text: 'Brazil', isCorrect: true }, { text: 'Germany', isCorrect: false }, { text: 'Italy', isCorrect: false }, { text: 'Argentina', isCorrect: false }]);
      addQ(st, 'What is the distance of a marathon?', 20, 1000,
        'A marathon is 42.195 kilometres (26.2 miles), standardised since the 1908 London Olympics.', 9,
        [{ text: '42.195 km (26.2 miles)', isCorrect: true }, { text: '21 km (13.1 miles)', isCorrect: false }, { text: '50 km (31 miles)', isCorrect: false }, { text: '10 km (6.2 miles)', isCorrect: false }]);
      addQ(st, 'How many hurdles are in a 110m hurdles race?', 15, 1000,
        'A 110m hurdles race has 10 hurdles spaced 9.14 metres apart.', 10,
        [{ text: '10', isCorrect: true }, { text: '8', isCorrect: false }, { text: '12', isCorrect: false }, { text: '15', isCorrect: false }]);
      addQ(st, 'What does FIFA stand for?', 20, 1200,
        'FIFA = Fédération Internationale de Football Association, founded in 1904.', 11,
        [{ text: 'Fédération Internationale de Football Association', isCorrect: true }, { text: 'Federal International Football Agency', isCorrect: false }, { text: 'Foundation for International Football Activities', isCorrect: false }, { text: 'Football International Federation of Athletes', isCorrect: false }]);
      addQ(st, 'Which Nigerian footballer was known as "Jay-Jay"?', 15, 1000,
        'Augustine "Jay-Jay" Okocha was famous for his dribbling skills and creativity.', 12,
        [{ text: 'Austin Okocha', isCorrect: true }, { text: 'Kanu Nwankwo', isCorrect: false }, { text: 'Rashidi Yekini', isCorrect: false }, { text: 'Mikel Obi', isCorrect: false }]);
      addQ(st, 'What sport uses a shuttlecock?', 15, 800,
        'Badminton uses a shuttlecock (also called a birdie) hit over a net with rackets.', 13,
        [{ text: 'Badminton', isCorrect: true }, { text: 'Table tennis', isCorrect: false }, { text: 'Squash', isCorrect: false }, { text: 'Volleyball', isCorrect: false }]);
      addQ(st, "How many sets must a player win in a men's singles match at Wimbledon?", 20, 1000,
        "Men's singles at Wimbledon is best of 5 sets — a player must win 3 sets.", 14,
        [{ text: '3 out of 5', isCorrect: true }, { text: '2 out of 3', isCorrect: false }, { text: '4 out of 7', isCorrect: false }, { text: '5 out of 9', isCorrect: false }]);
    }
  });

  seedAll();
  console.log('Upgraded 9 quizzes with 81 additional questions (6→15 each).');
}
