import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';

export function seedUpgradeB() {
  const db = getDb();

  const check = db.prepare(
    "SELECT COUNT(*) as count FROM questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.title = 'Human Biology'"
  ).get() as { count: number };
  if (check.count > 10) return;

  const findQuiz = db.prepare("SELECT id FROM quizzes WHERE title = ?");
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

  const getQuizId = (title: string): string | null => {
    const row = findQuiz.get(title) as { id: string } | undefined;
    return row?.id ?? null;
  };

  const seedAll = db.transaction(() => {
    // ─── HUMAN BIOLOGY ───
    const hb = getQuizId('Human Biology');
    if (hb) {
      addQ(hb, 'What is the smallest unit of life?', 15, 800,
        'The cell is the basic structural and functional unit of all living organisms.', 6,
        [{ text: 'Atom', isCorrect: false }, { text: 'Cell', isCorrect: true }, { text: 'Molecule', isCorrect: false }, { text: 'Tissue', isCorrect: false }]);
      addQ(hb, 'Which organ filters blood and produces urine?', 15, 1000,
        'The kidneys filter waste products from the blood and produce urine.', 7,
        [{ text: 'Liver', isCorrect: false }, { text: 'Kidney', isCorrect: true }, { text: 'Bladder', isCorrect: false }, { text: 'Spleen', isCorrect: false }]);
      addQ(hb, 'What connects muscles to bones?', 15, 1000,
        'Tendons are tough bands of fibrous tissue that connect muscles to bones.', 8,
        [{ text: 'Ligaments', isCorrect: false }, { text: 'Cartilage', isCorrect: false }, { text: 'Tendons', isCorrect: true }, { text: 'Nerves', isCorrect: false }]);
      addQ(hb, 'What part of the brain controls balance and coordination?', 20, 1000,
        'The cerebellum coordinates voluntary movements, balance, and posture.', 9,
        [{ text: 'Cerebrum', isCorrect: false }, { text: 'Cerebellum', isCorrect: true }, { text: 'Brain stem', isCorrect: false }, { text: 'Hypothalamus', isCorrect: false }]);
      addQ(hb, 'How many pairs of chromosomes do humans have?', 15, 1000,
        'Human cells contain 23 pairs (46 total) chromosomes.', 10,
        [{ text: '21', isCorrect: false }, { text: '23', isCorrect: true }, { text: '25', isCorrect: false }, { text: '46', isCorrect: false }]);
      addQ(hb, 'What is the main function of the small intestine?', 20, 1000,
        'The small intestine is where most nutrient absorption takes place.', 11,
        [{ text: 'Store food', isCorrect: false }, { text: 'Absorb nutrients', isCorrect: true }, { text: 'Produce bile', isCorrect: false }, { text: 'Break down fibre', isCorrect: false }]);
      addQ(hb, 'Which vitamin is essential for blood clotting?', 20, 1000,
        'Vitamin K is necessary for the synthesis of proteins required for blood coagulation.', 12,
        [{ text: 'Vitamin A', isCorrect: false }, { text: 'Vitamin C', isCorrect: false }, { text: 'Vitamin D', isCorrect: false }, { text: 'Vitamin K', isCorrect: true }]);
      addQ(hb, 'What gas do we primarily exhale?', 15, 800,
        'We exhale carbon dioxide, a waste product of cellular respiration.', 13,
        [{ text: 'Oxygen', isCorrect: false }, { text: 'Nitrogen', isCorrect: false }, { text: 'Carbon dioxide', isCorrect: true }, { text: 'Hydrogen', isCorrect: false }]);
      addQ(hb, 'What is the largest bone in the human body?', 15, 800,
        'The femur (thighbone) is the longest and strongest bone in the body.', 14,
        [{ text: 'Tibia', isCorrect: false }, { text: 'Humerus', isCorrect: false }, { text: 'Femur', isCorrect: true }, { text: 'Pelvis', isCorrect: false }]);
    }

    // ─── PLANT BIOLOGY ───
    const pb = getQuizId('Plant Biology');
    if (pb) {
      addQ(pb, 'What process do plants use to release energy from glucose?', 20, 1000,
        'Cellular respiration breaks down glucose to release energy, occurring in all living cells.', 6,
        [{ text: 'Photosynthesis', isCorrect: false }, { text: 'Transpiration', isCorrect: false }, { text: 'Cellular respiration', isCorrect: true }, { text: 'Fermentation', isCorrect: false }]);
      addQ(pb, 'What part of the plant carries water upward from the roots?', 15, 1000,
        'Xylem vessels transport water and dissolved minerals from roots to leaves.', 7,
        [{ text: 'Phloem', isCorrect: false }, { text: 'Xylem', isCorrect: true }, { text: 'Cambium', isCorrect: false }, { text: 'Cortex', isCorrect: false }]);
      addQ(pb, 'What is pollination?', 20, 1000,
        'Pollination is the transfer of pollen grains from the anther to the stigma of a flower.', 8,
        [{ text: 'Transfer of pollen from anther to stigma', isCorrect: true }, { text: 'The growth of a seed', isCorrect: false }, { text: 'Absorption of water by roots', isCorrect: false }, { text: 'Release of oxygen by leaves', isCorrect: false }]);
      addQ(pb, 'What type of plant lives for more than two years?', 15, 800,
        'Perennial plants live for more than two growing seasons, unlike annuals (one year) or biennials (two years).', 9,
        [{ text: 'Annual', isCorrect: false }, { text: 'Biennial', isCorrect: false }, { text: 'Perennial', isCorrect: true }, { text: 'Deciduous', isCorrect: false }]);
      addQ(pb, 'What is the male reproductive part of a flower?', 15, 1000,
        'The stamen consists of the anther (which produces pollen) and the filament.', 10,
        [{ text: 'Pistil', isCorrect: false }, { text: 'Stamen', isCorrect: true }, { text: 'Sepal', isCorrect: false }, { text: 'Petal', isCorrect: false }]);
      addQ(pb, 'What do seeds need to germinate?', 20, 1000,
        'Seeds require water, warmth (suitable temperature), and oxygen to begin germination.', 11,
        [{ text: 'Water, warmth, and oxygen', isCorrect: true }, { text: 'Sunlight, soil, and wind', isCorrect: false }, { text: 'Fertiliser, heat, and sand', isCorrect: false }, { text: 'Carbon dioxide, light, and minerals', isCorrect: false }]);
      addQ(pb, 'What is the outermost layer of a leaf called?', 15, 800,
        'The epidermis is the protective outer layer of the leaf, often covered with a waxy cuticle.', 12,
        [{ text: 'Mesophyll', isCorrect: false }, { text: 'Epidermis', isCorrect: true }, { text: 'Cortex', isCorrect: false }, { text: 'Palisade', isCorrect: false }]);
      addQ(pb, 'Which gas enters the leaf through stomata for photosynthesis?', 15, 800,
        'Carbon dioxide diffuses into the leaf through tiny pores called stomata.', 13,
        [{ text: 'Oxygen', isCorrect: false }, { text: 'Nitrogen', isCorrect: false }, { text: 'Carbon dioxide', isCorrect: true }, { text: 'Water vapour', isCorrect: false }]);
      addQ(pb, 'What tissue carries food from leaves to other parts of the plant?', 20, 1000,
        'Phloem transports sugars and other organic molecules produced in photosynthesis.', 14,
        [{ text: 'Xylem', isCorrect: false }, { text: 'Phloem', isCorrect: true }, { text: 'Cambium', isCorrect: false }, { text: 'Epidermis', isCorrect: false }]);
    }

    // ─── FORCES AND MOTION ───
    const fm = getQuizId('Forces and Motion');
    if (fm) {
      addQ(fm, 'What does Newton\'s Third Law state?', 25, 1200,
        'For every action, there is an equal and opposite reaction.', 6,
        [{ text: 'Objects at rest stay at rest', isCorrect: false }, { text: 'F = ma', isCorrect: false }, { text: 'Every action has an equal and opposite reaction', isCorrect: true }, { text: 'Energy is conserved', isCorrect: false }]);
      addQ(fm, 'What is the SI unit of work and energy?', 15, 1000,
        'The Joule (J) is the SI unit of work and energy, equal to 1 N·m.', 7,
        [{ text: 'Newton', isCorrect: false }, { text: 'Watt', isCorrect: false }, { text: 'Joule', isCorrect: true }, { text: 'Pascal', isCorrect: false }]);
      addQ(fm, 'What type of friction acts on objects moving through air?', 20, 1000,
        'Air resistance (also called drag) opposes the motion of objects through air.', 8,
        [{ text: 'Static friction', isCorrect: false }, { text: 'Air resistance', isCorrect: true }, { text: 'Sliding friction', isCorrect: false }, { text: 'Rolling friction', isCorrect: false }]);
      addQ(fm, 'What is momentum?', 20, 1000,
        'Momentum = mass × velocity. It is the quantity of motion an object has.', 9,
        [{ text: 'Mass × velocity', isCorrect: true }, { text: 'Force × time', isCorrect: false }, { text: 'Mass × acceleration', isCorrect: false }, { text: 'Weight × distance', isCorrect: false }]);
      addQ(fm, 'What is the formula for force according to Newton\'s Second Law?', 20, 1000,
        'Force = mass × acceleration (F = ma).', 10,
        [{ text: 'F = mv', isCorrect: false }, { text: 'F = ma', isCorrect: true }, { text: 'F = mg', isCorrect: false }, { text: 'F = ms', isCorrect: false }]);
      addQ(fm, 'If a car travels 100 km in 2 hours, what is its average speed?', 15, 800,
        'Average speed = distance ÷ time = 100 ÷ 2 = 50 km/h.', 11,
        [{ text: '25 km/h', isCorrect: false }, { text: '50 km/h', isCorrect: true }, { text: '100 km/h', isCorrect: false }, { text: '200 km/h', isCorrect: false }]);
      addQ(fm, 'What is the difference between mass and weight?', 25, 1200,
        'Mass is the amount of matter in an object (measured in kg); weight is the force of gravity acting on it (measured in N).', 12,
        [{ text: 'Mass is matter content; weight is the force of gravity on it', isCorrect: true }, { text: 'They are the same thing', isCorrect: false }, { text: 'Mass changes with location; weight does not', isCorrect: false }, { text: 'Weight is measured in kg; mass in Newtons', isCorrect: false }]);
      addQ(fm, 'What type of energy does a moving object have?', 15, 800,
        'Kinetic energy is the energy of motion, calculated as ½mv².', 13,
        [{ text: 'Potential energy', isCorrect: false }, { text: 'Kinetic energy', isCorrect: true }, { text: 'Thermal energy', isCorrect: false }, { text: 'Chemical energy', isCorrect: false }]);
      addQ(fm, 'What force keeps the Moon in orbit around Earth?', 15, 800,
        'Gravitational force between Earth and the Moon keeps it in orbit.', 14,
        [{ text: 'Magnetism', isCorrect: false }, { text: 'Friction', isCorrect: false }, { text: 'Gravity', isCorrect: true }, { text: 'Air pressure', isCorrect: false }]);
    }

    // ─── ENERGY AND ELECTRICITY ───
    const ee = getQuizId('Energy and Electricity');
    if (ee) {
      addQ(ee, 'What is power measured in?', 15, 800,
        'Power is measured in Watts (W), where 1 Watt = 1 Joule per second.', 6,
        [{ text: 'Volts', isCorrect: false }, { text: 'Amperes', isCorrect: false }, { text: 'Watts', isCorrect: true }, { text: 'Ohms', isCorrect: false }]);
      addQ(ee, 'In a series circuit, what happens when one bulb blows?', 20, 1000,
        'In a series circuit there is only one path for current, so if one bulb blows the circuit breaks and all bulbs go off.', 7,
        [{ text: 'Only that bulb goes off', isCorrect: false }, { text: 'All bulbs go off', isCorrect: true }, { text: 'The other bulbs get brighter', isCorrect: false }, { text: 'Nothing happens', isCorrect: false }]);
      addQ(ee, 'What device converts mechanical energy to electrical energy?', 20, 1000,
        'A generator converts mechanical energy into electrical energy using electromagnetic induction.', 8,
        [{ text: 'Motor', isCorrect: false }, { text: 'Generator', isCorrect: true }, { text: 'Transformer', isCorrect: false }, { text: 'Battery', isCorrect: false }]);
      addQ(ee, 'What is the formula for electrical power?', 20, 1000,
        'Electrical power P = IV (Power = Current × Voltage).', 9,
        [{ text: 'P = IR', isCorrect: false }, { text: 'P = IV', isCorrect: true }, { text: 'P = V/I', isCorrect: false }, { text: 'P = I²V', isCorrect: false }]);
      addQ(ee, 'What type of current comes from a battery?', 15, 800,
        'Batteries produce direct current (DC), where electrons flow in one direction.', 10,
        [{ text: 'Alternating current (AC)', isCorrect: false }, { text: 'Direct current (DC)', isCorrect: true }, { text: 'Static current', isCorrect: false }, { text: 'Pulsed current', isCorrect: false }]);
      addQ(ee, 'What is the most common semiconductor material used in electronics?', 20, 1000,
        'Silicon is the most widely used semiconductor, forming the basis of most computer chips.', 11,
        [{ text: 'Copper', isCorrect: false }, { text: 'Gold', isCorrect: false }, { text: 'Silicon', isCorrect: true }, { text: 'Aluminium', isCorrect: false }]);
      addQ(ee, 'How many watts are in one kilowatt?', 15, 800,
        'The prefix "kilo" means 1000, so 1 kilowatt = 1000 watts.', 12,
        [{ text: '100', isCorrect: false }, { text: '1000', isCorrect: true }, { text: '10000', isCorrect: false }, { text: '500', isCorrect: false }]);
      addQ(ee, 'What device stores electrical charge?', 15, 1000,
        'A capacitor stores electrical energy in an electric field between two conductive plates.', 13,
        [{ text: 'Resistor', isCorrect: false }, { text: 'Capacitor', isCorrect: true }, { text: 'Inductor', isCorrect: false }, { text: 'Transistor', isCorrect: false }]);
      addQ(ee, 'Which electronic component allows current to flow in only one direction?', 20, 1000,
        'A diode permits current flow in one direction (forward bias) and blocks it in the reverse direction.', 14,
        [{ text: 'Resistor', isCorrect: false }, { text: 'Capacitor', isCorrect: false }, { text: 'Diode', isCorrect: true }, { text: 'Fuse', isCorrect: false }]);
    }

    // ─── ELEMENTS & PERIODIC TABLE ───
    const ep = getQuizId('Elements & Periodic Table');
    if (ep) {
      addQ(ep, 'What is the chemical symbol for iron?', 15, 800,
        'Fe comes from the Latin word "ferrum" meaning iron.', 6,
        [{ text: 'Ir', isCorrect: false }, { text: 'Fe', isCorrect: true }, { text: 'In', isCorrect: false }, { text: 'Io', isCorrect: false }]);
      addQ(ep, 'What are the horizontal rows in the periodic table called?', 15, 1000,
        'Rows are called periods; columns are called groups.', 7,
        [{ text: 'Groups', isCorrect: false }, { text: 'Periods', isCorrect: true }, { text: 'Series', isCorrect: false }, { text: 'Blocks', isCorrect: false }]);
      addQ(ep, 'What is the chemical formula for table salt?', 15, 800,
        'Table salt is sodium chloride, formed from sodium (Na) and chlorine (Cl).', 8,
        [{ text: 'NaOH', isCorrect: false }, { text: 'KCl', isCorrect: false }, { text: 'NaCl', isCorrect: true }, { text: 'CaCl₂', isCorrect: false }]);
      addQ(ep, 'How many electrons does a neutral carbon atom have?', 20, 1000,
        'Carbon has atomic number 6, so a neutral atom has 6 protons and 6 electrons.', 9,
        [{ text: '4', isCorrect: false }, { text: '6', isCorrect: true }, { text: '8', isCorrect: false }, { text: '12', isCorrect: false }]);
      addQ(ep, 'What is an isotope?', 25, 1200,
        'Isotopes are atoms of the same element with the same number of protons but different numbers of neutrons.', 10,
        [{ text: 'Atoms with the same element but different neutrons', isCorrect: true }, { text: 'Atoms of different elements with the same mass', isCorrect: false }, { text: 'Molecules with the same formula', isCorrect: false }, { text: 'Elements with the same number of electrons', isCorrect: false }]);
      addQ(ep, 'What gas is produced when acids react with metals?', 20, 1000,
        'Acids react with reactive metals to produce a salt and hydrogen gas.', 11,
        [{ text: 'Oxygen', isCorrect: false }, { text: 'Nitrogen', isCorrect: false }, { text: 'Hydrogen', isCorrect: true }, { text: 'Carbon dioxide', isCorrect: false }]);
      addQ(ep, 'Which element is the most abundant in the Earth\'s crust?', 20, 1000,
        'Oxygen makes up about 46% of the Earth\'s crust by mass.', 12,
        [{ text: 'Silicon', isCorrect: false }, { text: 'Aluminium', isCorrect: false }, { text: 'Iron', isCorrect: false }, { text: 'Oxygen', isCorrect: true }]);
      addQ(ep, 'What state of matter is mercury at room temperature?', 15, 800,
        'Mercury is the only metal that is liquid at standard room temperature and pressure.', 13,
        [{ text: 'Solid', isCorrect: false }, { text: 'Liquid', isCorrect: true }, { text: 'Gas', isCorrect: false }, { text: 'Plasma', isCorrect: false }]);
      addQ(ep, 'What is the chemical formula for carbon dioxide?', 15, 800,
        'Carbon dioxide consists of one carbon atom and two oxygen atoms: CO₂.', 14,
        [{ text: 'CO', isCorrect: false }, { text: 'CO₂', isCorrect: true }, { text: 'C₂O', isCorrect: false }, { text: 'CO₃', isCorrect: false }]);
    }

    // ─── SPACE & ASTRONOMY ───
    const sa = getQuizId('Space & Astronomy');
    if (sa) {
      addQ(sa, 'What is a light-year?', 20, 1000,
        'A light-year is the distance light travels in one year — about 9.46 trillion kilometres.', 6,
        [{ text: 'A unit of time', isCorrect: false }, { text: 'The distance light travels in one year', isCorrect: true }, { text: 'The brightness of a star', isCorrect: false }, { text: 'The speed of light', isCorrect: false }]);
      addQ(sa, 'What galaxy do we live in?', 15, 800,
        'Our solar system is located in the Milky Way galaxy.', 7,
        [{ text: 'Andromeda', isCorrect: false }, { text: 'Milky Way', isCorrect: true }, { text: 'Triangulum', isCorrect: false }, { text: 'Centaurus', isCorrect: false }]);
      addQ(sa, 'Which planet has the Great Red Spot?', 15, 1000,
        'Jupiter\'s Great Red Spot is a giant storm that has been raging for centuries.', 8,
        [{ text: 'Mars', isCorrect: false }, { text: 'Saturn', isCorrect: false }, { text: 'Jupiter', isCorrect: true }, { text: 'Neptune', isCorrect: false }]);
      addQ(sa, 'What primarily causes tides on Earth?', 20, 1000,
        'Tides are mainly caused by the gravitational pull of the Moon on Earth\'s oceans.', 9,
        [{ text: 'The Sun\'s heat', isCorrect: false }, { text: 'Earth\'s rotation', isCorrect: false }, { text: 'The Moon\'s gravitational pull', isCorrect: true }, { text: 'Ocean currents', isCorrect: false }]);
      addQ(sa, 'What was the first artificial satellite launched into space?', 20, 1000,
        'Sputnik 1 was launched by the Soviet Union on 4 October 1957.', 10,
        [{ text: 'Explorer 1', isCorrect: false }, { text: 'Sputnik', isCorrect: true }, { text: 'Vostok', isCorrect: false }, { text: 'Apollo', isCorrect: false }]);
      addQ(sa, 'How long does it take Earth to orbit the Sun?', 15, 800,
        'Earth takes approximately 365.25 days (one year) to complete one orbit around the Sun.', 11,
        [{ text: '24 hours', isCorrect: false }, { text: '30 days', isCorrect: false }, { text: '365.25 days', isCorrect: true }, { text: '28 days', isCorrect: false }]);
      addQ(sa, 'What is a "shooting star" actually?', 20, 1000,
        'A shooting star is a meteor — a small piece of space debris burning up as it enters Earth\'s atmosphere.', 12,
        [{ text: 'A dying star', isCorrect: false }, { text: 'A meteor burning up in the atmosphere', isCorrect: true }, { text: 'A comet', isCorrect: false }, { text: 'A satellite', isCorrect: false }]);
      addQ(sa, 'Which planet rotates on its side?', 20, 1000,
        'Uranus has an axial tilt of about 98°, effectively rotating on its side.', 13,
        [{ text: 'Venus', isCorrect: false }, { text: 'Neptune', isCorrect: false }, { text: 'Uranus', isCorrect: true }, { text: 'Mercury', isCorrect: false }]);
      addQ(sa, 'What is the Sun primarily made of?', 15, 800,
        'The Sun is composed mainly of hydrogen (~73%) and helium (~25%).', 14,
        [{ text: 'Iron and nickel', isCorrect: false }, { text: 'Hydrogen and helium', isCorrect: true }, { text: 'Oxygen and carbon', isCorrect: false }, { text: 'Nitrogen and argon', isCorrect: false }]);
    }

    // ─── ENVIRONMENT & CLIMATE ───
    const ec = getQuizId('Environment & Climate');
    if (ec) {
      addQ(ec, 'What is biodiversity?', 20, 1000,
        'Biodiversity refers to the variety of life forms in a particular ecosystem or on Earth as a whole.', 6,
        [{ text: 'The study of biology', isCorrect: false }, { text: 'The variety of life in an ecosystem', isCorrect: true }, { text: 'A type of renewable energy', isCorrect: false }, { text: 'The number of humans in an area', isCorrect: false }]);
      addQ(ec, 'What causes acid rain?', 20, 1000,
        'Acid rain is caused by sulfur dioxide (SO₂) and nitrogen oxides (NOₓ) reacting with water in the atmosphere.', 7,
        [{ text: 'Carbon dioxide only', isCorrect: false }, { text: 'Sulfur dioxide and nitrogen oxides', isCorrect: true }, { text: 'Ozone depletion', isCorrect: false }, { text: 'Excess oxygen', isCorrect: false }]);
      addQ(ec, 'What is a carbon footprint?', 20, 1000,
        'A carbon footprint is the total amount of greenhouse gases emitted by a person, organisation, or activity.', 8,
        [{ text: 'A type of fossil fuel', isCorrect: false }, { text: 'A footprint made of carbon', isCorrect: false }, { text: 'Total greenhouse gas emissions caused by a person or activity', isCorrect: true }, { text: 'The amount of carbon in soil', isCorrect: false }]);
      addQ(ec, 'What is the greenhouse effect?', 25, 1200,
        'The greenhouse effect is when gases in the atmosphere (like CO₂ and methane) trap heat from the Sun, warming the Earth.', 9,
        [{ text: 'Gases in the atmosphere trap heat from the Sun', isCorrect: true }, { text: 'Plants growing in greenhouses', isCorrect: false }, { text: 'The ozone layer blocking UV light', isCorrect: false }, { text: 'Rain caused by industrial pollution', isCorrect: false }]);
      addQ(ec, 'Which layer of the atmosphere do we live in?', 15, 800,
        'The troposphere extends from the surface to about 12 km and is where all weather occurs.', 10,
        [{ text: 'Stratosphere', isCorrect: false }, { text: 'Mesosphere', isCorrect: false }, { text: 'Troposphere', isCorrect: true }, { text: 'Thermosphere', isCorrect: false }]);
      addQ(ec, 'What is composting?', 15, 800,
        'Composting is the natural process of decomposing organic waste into nutrient-rich soil.', 11,
        [{ text: 'Burning waste', isCorrect: false }, { text: 'Decomposing organic waste into nutrient-rich soil', isCorrect: true }, { text: 'Burying plastic underground', isCorrect: false }, { text: 'Filtering water', isCorrect: false }]);
      addQ(ec, 'What percentage of Earth\'s surface is covered by water?', 15, 1000,
        'About 71% of Earth\'s surface is covered by water, mostly in the oceans.', 12,
        [{ text: 'About 50%', isCorrect: false }, { text: 'About 71%', isCorrect: true }, { text: 'About 85%', isCorrect: false }, { text: 'About 30%', isCorrect: false }]);
      addQ(ec, 'What is an endangered species?', 15, 800,
        'An endangered species is one that is at serious risk of extinction in the wild.', 13,
        [{ text: 'A species that is very common', isCorrect: false }, { text: 'A species at risk of extinction', isCorrect: true }, { text: 'A newly discovered species', isCorrect: false }, { text: 'A species that lives in danger zones', isCorrect: false }]);
      addQ(ec, 'What is the main cause of deforestation worldwide?', 20, 1000,
        'Agriculture (including cattle ranching and crop farming) and logging are the primary drivers of deforestation.', 14,
        [{ text: 'Natural disasters', isCorrect: false }, { text: 'Tourism', isCorrect: false }, { text: 'Agriculture and logging', isCorrect: true }, { text: 'Urbanisation only', isCorrect: false }]);
    }

    // ─── PARTS OF SPEECH ───
    const ps = getQuizId('Parts of Speech');
    if (ps) {
      addQ(ps, 'What is a pronoun?', 15, 800,
        'A pronoun is a word that takes the place of a noun, such as he, she, it, they.', 6,
        [{ text: 'A word that replaces a noun', isCorrect: true }, { text: 'A word that describes a verb', isCorrect: false }, { text: 'A word that joins sentences', isCorrect: false }, { text: 'A word that shows action', isCorrect: false }]);
      addQ(ps, 'Which of these words is a conjunction: "and", "quickly", "happy"?', 15, 800,
        'Conjunctions connect words, phrases, or clauses. "And" is a coordinating conjunction.', 7,
        [{ text: 'quickly', isCorrect: false }, { text: 'happy', isCorrect: false }, { text: 'and', isCorrect: true }, { text: 'very', isCorrect: false }]);
      addQ(ps, 'What is the past tense of "run"?', 15, 800,
        '"Run" is an irregular verb. Its past tense is "ran".', 8,
        [{ text: 'runned', isCorrect: false }, { text: 'ran', isCorrect: true }, { text: 'runed', isCorrect: false }, { text: 'running', isCorrect: false }]);
      addQ(ps, 'Identify the preposition in: "The book is on the table."', 20, 1000,
        '"On" is a preposition showing the relationship between the book and the table.', 9,
        [{ text: 'The', isCorrect: false }, { text: 'is', isCorrect: false }, { text: 'on', isCorrect: true }, { text: 'table', isCorrect: false }]);
      addQ(ps, 'What type of word is "beautiful"?', 15, 800,
        '"Beautiful" is an adjective — it describes a noun (e.g., a beautiful flower).', 10,
        [{ text: 'Noun', isCorrect: false }, { text: 'Verb', isCorrect: false }, { text: 'Adjective', isCorrect: true }, { text: 'Adverb', isCorrect: false }]);
      addQ(ps, 'What is an interjection?', 20, 1000,
        'An interjection is a word or phrase that expresses strong emotion, such as "Wow!", "Oh!", or "Ouch!".', 11,
        [{ text: 'A word that expresses emotion', isCorrect: true }, { text: 'A word that connects clauses', isCorrect: false }, { text: 'A word that describes a noun', isCorrect: false }, { text: 'A word that shows possession', isCorrect: false }]);
      addQ(ps, 'Which is the correct possessive form: "The dogs bone" or "The dog\'s bone"?', 20, 1000,
        'An apostrophe before the "s" shows possession: "The dog\'s bone" means the bone belonging to the dog.', 12,
        [{ text: 'The dogs bone', isCorrect: false }, { text: 'The dog\'s bone', isCorrect: true }, { text: 'The dogs\' bone', isCorrect: false }, { text: 'The dog bone', isCorrect: false }]);
      addQ(ps, 'What is a compound sentence?', 20, 1000,
        'A compound sentence contains two independent clauses joined by a conjunction (e.g., "I like tea, and she likes coffee.").', 13,
        [{ text: 'A sentence with one subject', isCorrect: false }, { text: 'Two independent clauses joined by a conjunction', isCorrect: true }, { text: 'A sentence with many adjectives', isCorrect: false }, { text: 'A very long sentence', isCorrect: false }]);
      addQ(ps, '"She sings beautifully." What part of speech is "beautifully"?', 15, 800,
        '"Beautifully" is an adverb — it modifies the verb "sings", telling us how she sings.', 14,
        [{ text: 'Adjective', isCorrect: false }, { text: 'Adverb', isCorrect: true }, { text: 'Noun', isCorrect: false }, { text: 'Verb', isCorrect: false }]);
    }

    // ─── VOCABULARY BUILDER ───
    const vb = getQuizId('Vocabulary Builder');
    if (vb) {
      addQ(vb, 'What does "ambiguous" mean?', 20, 1000,
        'Ambiguous means open to more than one interpretation; not having a clear meaning.', 6,
        [{ text: 'Very clear', isCorrect: false }, { text: 'Having more than one meaning; unclear', isCorrect: true }, { text: 'Extremely large', isCorrect: false }, { text: 'Very old', isCorrect: false }]);
      addQ(vb, 'What is the opposite of "generous"?', 15, 800,
        'The antonym of generous (willing to give) is stingy or selfish.', 7,
        [{ text: 'Kind', isCorrect: false }, { text: 'Wealthy', isCorrect: false }, { text: 'Stingy', isCorrect: true }, { text: 'Brave', isCorrect: false }]);
      addQ(vb, 'What does the root word "bio" mean?', 15, 800,
        'The Greek root "bio" means life, as in biology (study of life) and biography (life story).', 8,
        [{ text: 'Earth', isCorrect: false }, { text: 'Water', isCorrect: false }, { text: 'Life', isCorrect: true }, { text: 'Light', isCorrect: false }]);
      addQ(vb, 'What does "reluctant" mean?', 15, 1000,
        'Reluctant means unwilling or hesitant to do something.', 9,
        [{ text: 'Eager and excited', isCorrect: false }, { text: 'Unwilling or hesitant', isCorrect: true }, { text: 'Calm and relaxed', isCorrect: false }, { text: 'Angry and upset', isCorrect: false }]);
      addQ(vb, 'What is a homophone?', 20, 1000,
        'Homophones are words that sound the same but have different meanings and often different spellings (e.g., their/there/they\'re).', 10,
        [{ text: 'Words that sound the same but have different meanings', isCorrect: true }, { text: 'Words that mean the same thing', isCorrect: false }, { text: 'Words that rhyme', isCorrect: false }, { text: 'Words with the same spelling', isCorrect: false }]);
      addQ(vb, 'What does "elaborate" mean?', 20, 1000,
        '"Elaborate" can mean detailed and complex (adjective) or to explain in more detail (verb).', 11,
        [{ text: 'Simple and brief', isCorrect: false }, { text: 'Detailed and complex', isCorrect: true }, { text: 'Hidden and secret', isCorrect: false }, { text: 'Loud and obvious', isCorrect: false }]);
      addQ(vb, 'What suffix turns "hope" into an adjective?', 15, 800,
        'Adding "-ful" creates "hopeful", an adjective meaning full of hope.', 12,
        [{ text: '-ness', isCorrect: false }, { text: '-ly', isCorrect: false }, { text: '-ful', isCorrect: true }, { text: '-ing', isCorrect: false }]);
      addQ(vb, 'What does "inevitable" mean?', 20, 1000,
        'Inevitable means certain to happen; unavoidable.', 13,
        [{ text: 'Impossible', isCorrect: false }, { text: 'Unlikely', isCorrect: false }, { text: 'Certain to happen; unavoidable', isCorrect: true }, { text: 'Easily prevented', isCorrect: false }]);
      addQ(vb, '"The wind whispered through the trees." This is an example of what literary device?', 20, 1200,
        'Personification gives human qualities to non-human things. Wind cannot literally whisper.', 14,
        [{ text: 'Simile', isCorrect: false }, { text: 'Metaphor', isCorrect: false }, { text: 'Personification', isCorrect: true }, { text: 'Alliteration', isCorrect: false }]);
    }
  });

  seedAll();
  console.log('Upgraded 9 quizzes with 81 additional questions (9 each).');
}
