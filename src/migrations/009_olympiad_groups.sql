-- Олимпиадаға дайындық топтары: мұғалім оқушыларды жинайды (өз сыныптарынан немесе топ кодымен),
-- олимпиадалық есептер мен ресми онлайн тесттерді тапсырма етіп береді; оқушы есептің шешімін суретке түсіріп жүктейді,
-- мұғалім ұпай мен пікір қояды.
CREATE TABLE olympiad_groups (
  id serial PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX olympiad_groups_teacher_idx ON olympiad_groups(teacher_id);

CREATE TABLE olympiad_group_members (
  group_id int NOT NULL REFERENCES olympiad_groups(id) ON DELETE CASCADE,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX olympiad_group_members_user_idx ON olympiad_group_members(user_id);

CREATE TABLE olympiad_tasks (
  id serial PRIMARY KEY,
  group_id int NOT NULL REFERENCES olympiad_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  problems text[] NOT NULL DEFAULT '{}',
  tests text[] NOT NULL DEFAULT '{}',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX olympiad_tasks_group_idx ON olympiad_tasks(group_id, created_at DESC);

CREATE TABLE olympiad_solutions (
  id serial PRIMARY KEY,
  task_id int NOT NULL REFERENCES olympiad_tasks(id) ON DELETE CASCADE,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_key text NOT NULL,
  answer text NOT NULL DEFAULT '',
  file_key text,
  file_ext text NOT NULL DEFAULT '',
  score int,
  comment text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  UNIQUE (task_id, user_id, problem_key)
);
