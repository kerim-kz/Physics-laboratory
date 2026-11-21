-- Халықаралық зерттеулер: TIMSS, PIRLS, ICILS тапсырмалары (TALIS — сауалнама, банкке кірмейді).
ALTER TABLE exam_units DROP CONSTRAINT IF EXISTS exam_units_exam_check;
ALTER TABLE exam_units ADD CONSTRAINT exam_units_exam_check CHECK (exam IN ('pisa', 'timss', 'pirls', 'icils', 'bbzhm', 'ubt'));
