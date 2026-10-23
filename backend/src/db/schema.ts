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

    CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON answer_options(question_id);
    CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_pin ON game_sessions(pin);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_question_responses_unique
      ON question_responses(session_id, player_id, question_id);
  `);

  return db;
}
