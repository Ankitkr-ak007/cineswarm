-- Alter movies table to change embedding from vector(384) to vector(768)
ALTER TABLE movies ALTER COLUMN embedding TYPE vector(768);

-- Update match_movies function to accept vector(768)
CREATE OR REPLACE FUNCTION match_movies (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  tmdb_id int,
  title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    movies.tmdb_id,
    movies.title,
    1 - (movies.embedding <=> query_embedding) AS similarity
  FROM movies
  WHERE 1 - (movies.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
