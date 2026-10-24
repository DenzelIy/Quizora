import Database from 'better-sqlite3';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'true-false')),
      text TEXT NOT NULL,
      image_url TEXT,
      time_limit INTEGER NOT NULL DEFAULT 30,
      points INTEGER NOT NULL DEFAULT 1000,
      explanation TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answer_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT REFERENCES quizzes(id),
      pin TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','STARTING','QUESTION_ACTIVE','ANSWER_REVEAL','LEADERBOARD','FINISHED')),
      host_socket_id TEXT,
      settings TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      socket_id TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      total_answers INTEGER NOT NULL DEFAULT 0,
      is_connected INTEGER NOT NULL DEFAULT 1,
      joined_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer_id TEXT,
      is_correct INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      response_time_ms INTEGER,
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Content Packs
    CREATE TABLE IF NOT EXISTS content_packs (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK (category IN ('culture','stem')),
      subject TEXT,
      tags TEXT,
      difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced','mixed')),
      grade_level TEXT,
      curriculum TEXT,
      author TEXT,
      source TEXT,
      source_url TEXT,
      license TEXT DEFAULT 'original',
      version INTEGER NOT NULL DEFAULT 1,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','draft')),
      pack_type TEXT NOT NULL DEFAULT 'standard' CHECK (pack_type IN ('standard','narrative','exam')),
      estimated_duration_min INTEGER,
      total_questions INTEGER NOT NULL DEFAULT 0,
      times_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Chapters/sections within a pack
    CREATE TABLE IF NOT EXISTS pack_chapters (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      content_text TEXT,
      image_url TEXT,
      order_index INTEGER NOT NULL,
      chapter_type TEXT NOT NULL DEFAULT 'content' CHECK (chapter_type IN ('intro','content','summary','exam'))
    );

    -- Questions belonging to a pack (linked to pack + optionally chapter)
    CREATE TABLE IF NOT EXISTS pack_questions (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
      chapter_id TEXT REFERENCES pack_chapters(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (type IN ('multiple-choice','true-false')),
      text TEXT NOT NULL,
      image_url TEXT,
      time_limit INTEGER NOT NULL DEFAULT 30,
      points INTEGER NOT NULL DEFAULT 1000,
      explanation TEXT,
      topic TEXT,
      difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
      order_index INTEGER NOT NULL,
      math_notation INTEGER NOT NULL DEFAULT 0
    );

    -- Answer options for pack questions
    CREATE TABLE IF NOT EXISTS pack_answer_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL
    );

    -- Learning objectives for a pack
    CREATE TABLE IF NOT EXISTS pack_objectives (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    -- Track which pack questions were imported into teacher quizzes
    CREATE TABLE IF NOT EXISTS pack_question_imports (
      id TEXT PRIMARY KEY,
      pack_question_id TEXT NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
      quiz_question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      imported_at TEXT DEFAULT (datetime('now')),
      UNIQUE(pack_question_id, quiz_question_id)
    );

    -- Griot Mode: narrative scenes
    CREATE TABLE IF NOT EXISTS pack_scenes (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      narrator_text TEXT NOT NULL,
      background_image TEXT,
      narrator_mood TEXT DEFAULT 'neutral' CHECK (narrator_mood IN ('neutral','happy','thinking','excited','serious')),
      audio_file TEXT,
      duration_seconds INTEGER,
      order_index INTEGER NOT NULL,
      question_id TEXT REFERENCES pack_questions(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_packs_category ON content_packs(category);
    CREATE INDEX IF NOT EXISTS idx_content_packs_slug ON content_packs(slug);
    CREATE INDEX IF NOT EXISTS idx_pack_chapters_pack_id ON pack_chapters(pack_id);
    CREATE INDEX IF NOT EXISTS idx_pack_questions_pack_id ON pack_questions(pack_id);
    CREATE INDEX IF NOT EXISTS idx_pack_questions_chapter_id ON pack_questions(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_pack_answer_options_question_id ON pack_answer_options(question_id);
    CREATE INDEX IF NOT EXISTS idx_pack_objectives_pack_id ON pack_objectives(pack_id);
    CREATE INDEX IF NOT EXISTS idx_pack_question_imports_quiz_id ON pack_question_imports(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_pack_scenes_pack_id ON pack_scenes(pack_id);

    CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON answer_options(question_id);
    CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_pin ON game_sessions(pin);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_question_responses_unique
      ON question_responses(session_id, player_id, question_id);
  `);

  return db;
}
