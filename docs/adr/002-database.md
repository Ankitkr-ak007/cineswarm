# ADR-002: Database Choice
Status: Accepted
Context: We need a database to store movie data, agent debate transcripts, and support semantic/vector search for hidden gems or similar vibes.
Decision: We will use Postgres + pgvector (via Supabase) over MongoDB.
Consequences: While MongoDB offers flexible document schemas, Postgres provides relational integrity (good for users/movies), vector search natively via pgvector, and JSONB flexibility in a single managed service. We accept the learning curve of relational modeling combined with vector indices.
