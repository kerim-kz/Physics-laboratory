-- PISA/ББЖМ бағыттары (оқу, математика, жаратылыстану), жаңа сұрақ түрлері,
-- мұғалімнің тест тағайындауы және сайт ішіндегі хабарламалар.

ALTER TABLE exam_units ADD COLUMN domain text NOT NULL DEFAULT '';
ALTER TABLE exam_units ADD COLUMN image text NOT NULL DEFAULT '';
ALTER TABLE exam_units ADD COLUMN source text NOT NULL DEFAULT '';
UPDATE exam_units SET domain = 'science' WHERE exam IN ('pisa', 'bbzhm');
CREATE INDEX exam_units_domain_idx ON exam_units(exam, domain);

-- single/multi — таңдау; matrix — «Иә/Жоқ» кестесі; number — сан жазу; open — мұғалім бағалайтын ашық жауап.
ALTER TABLE exam_questions DROP CONSTRAINT IF EXISTS exam_questions_kind_check;
ALTER TABLE exam_questions ADD CONSTRAINT exam_questions_kind_check CHECK (kind IN ('single', 'multi', 'matrix', 'number', 'open'));
ALTER TABLE exam_questions ADD COLUMN image text NOT NULL DEFAULT '';
ALTER TABLE exam_questions ADD COLUMN rubric text NOT NULL DEFAULT '';

CREATE TABLE exam_assignments (
  id serial PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id int REFERENCES classes(id) ON DELETE SET NULL,
  exam text NOT NULL,
  domain text NOT NULL DEFAULT '',
  title text NOT NULL,
  unit_ids int[] NOT NULL,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exam_assignments_teacher_idx ON exam_assignments(teacher_id, created_at DESC);

CREATE TABLE exam_assignment_students (
  assignment_id int NOT NULL REFERENCES exam_assignments(id) ON DELETE CASCADE,
  student_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, student_id)
);
CREATE INDEX exam_assignment_students_student_idx ON exam_assignment_students(student_id);

ALTER TABLE exam_attempts ADD COLUMN domain text NOT NULL DEFAULT '';
ALTER TABLE exam_attempts ADD COLUMN assignment_id int REFERENCES exam_assignments(id) ON DELETE SET NULL;
ALTER TABLE exam_attempts ADD COLUMN answers jsonb;
ALTER TABLE exam_attempts ADD COLUMN pending int NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX exam_attempts_assignment_uniq ON exam_attempts(assignment_id, user_id) WHERE assignment_id IS NOT NULL;

CREATE TABLE notifications (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications(user_id, read_at, created_at DESC);
