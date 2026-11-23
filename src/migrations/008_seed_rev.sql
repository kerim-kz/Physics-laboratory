-- Бастапқы банк блоктарының мазмұн нұсқасы: деректер файлындағы rev үлкен болса, блок іске қосылғанда жаңартылады.
ALTER TABLE exam_units ADD COLUMN IF NOT EXISTS seed_rev int NOT NULL DEFAULT 1;
