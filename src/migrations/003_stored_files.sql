-- Тегін хостингте (FILE_STORAGE=db) жүктелген файлдардың мазмұны осында сақталады.
CREATE TABLE stored_files (
  key text PRIMARY KEY,
  data bytea NOT NULL,
  size int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
