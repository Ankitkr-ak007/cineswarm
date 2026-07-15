-- Enable pgvector extension
create extension if not exists vector;

-- Create tables
create table if not exists users (
  id uuid primary key,
  email text,
  role text check (role in ('user','admin')) default 'user',
  content_mode text check (content_mode in ('kids','general')) default 'general',
  kids_pin_hash text,
  created_at timestamptz default now()
);

create table if not exists movies (
  tmdb_id int primary key,
  title text,
  overview text,
  genres jsonb,
  release_date date,
  certification text,
  adult boolean,
  poster_path text,
  embedding vector(384)
);

create table if not exists sessions (
  id uuid primary key,
  user_id uuid references users,
  query_context jsonb,
  created_at timestamptz default now()
);

create table if not exists agent_runs (
  id uuid primary key,
  session_id uuid references sessions,
  movie_id int references movies,
  agent_name text,
  output jsonb,
  score numeric,
  latency_ms int,
  status text check (status in ('ok','failed','timeout')),
  created_at timestamptz default now()
);

create table if not exists ratings (
  id uuid primary key,
  session_id uuid references sessions,
  movie_id int references movies,
  actual_rating numeric,
  consensus_score numeric,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key,
  user_id uuid references users,
  movie_id int references movies,
  user_rating numeric,
  watched boolean,
  created_at timestamptz default now()
);

-- Create match_movies function for vector similarity
create or replace function match_movies (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  tmdb_id int,
  title text,
  similarity float
)
language sql stable
as $$
  select
    movies.tmdb_id,
    movies.title,
    1 - (movies.embedding <=> query_embedding) as similarity
  from movies
  where 1 - (movies.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
