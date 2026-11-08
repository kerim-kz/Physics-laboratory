-- Платформада орындалған зертханалардың нәтижелері (артефактідегі subs/{uid} құжаттарының орнына).
CREATE TABLE lab_subs (
  id serial PRIMARY KEY,
  lab_key text NOT NULL,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_key, user_id)
);
CREATE INDEX lab_subs_user_idx ON lab_subs(user_id);

-- Журнал жазбасының қайдан келгені: 'code' — мұғалім кодты қолмен енгізді, 'online' — оқушы платформада тапсырды.
ALTER TABLE lab_results ADD COLUMN student_id int REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lab_results ADD COLUMN source text NOT NULL DEFAULT 'code';
