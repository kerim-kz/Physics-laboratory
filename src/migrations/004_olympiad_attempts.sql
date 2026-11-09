-- Ресми олимпиада тапсырмаларының онлайн тест нәтижелері.
CREATE TABLE olympiad_attempts (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_key text NOT NULL,
  score int NOT NULL,
  max_score int NOT NULL,
  correct_count int NOT NULL,
  total int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX olympiad_attempts_test_idx ON olympiad_attempts(test_key, score DESC);
CREATE INDEX olympiad_attempts_user_idx ON olympiad_attempts(user_id, created_at DESC);
