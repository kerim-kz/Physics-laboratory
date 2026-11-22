-- ЖИ құралы: әр сұраныстың есебі (күнделікті лимит және әкімшіге шығын есебі үшін).
-- Сұраныстың мәтіні сақталмайды — тек кім, қай функция, қанша токен.
CREATE TABLE IF NOT EXISTS ai_usage (
  id            bigserial PRIMARY KEY,
  user_id       integer REFERENCES users(id) ON DELETE SET NULL,
  role          text NOT NULL,
  feature       text NOT NULL,
  model         text NOT NULL DEFAULT '',
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  ok            boolean,               -- NULL: орындалуда, true: сәтті, false: қате (лимитке есептелмейді)
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_day ON ai_usage (user_id, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_created ON ai_usage (created_at);
