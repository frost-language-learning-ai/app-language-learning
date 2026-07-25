CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'knowledge_node_type') THEN
    CREATE TYPE knowledge_node_type AS ENUM ('nuance_comparison', 'context_usage', 'grammar_rule');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audio_type') THEN
    CREATE TYPE audio_type AS ENUM ('model_voice', 'user_voice');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS core_terms (
  id BIGSERIAL PRIMARY KEY,
  term_en TEXT NOT NULL,
  term_de TEXT NOT NULL,
  ipa_uk TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_core_terms_pair UNIQUE (term_en, term_de)
);

CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id BIGSERIAL PRIMARY KEY,
  term_id BIGINT NOT NULL REFERENCES core_terms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type knowledge_node_type NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding VECTOR(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audio_repository (
  id BIGSERIAL PRIMARY KEY,
  term_id BIGINT NOT NULL REFERENCES core_terms(id) ON DELETE CASCADE,
  type audio_type NOT NULL,
  file_url TEXT NOT NULL,
  self_evaluation SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_audio_self_eval CHECK (self_evaluation IS NULL OR self_evaluation BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS term_evaluation_history (
  id BIGSERIAL PRIMARY KEY,
  term_id BIGINT NOT NULL REFERENCES core_terms(id) ON DELETE CASCADE,
  audio_id BIGINT REFERENCES audio_repository(id) ON DELETE SET NULL,
  self_evaluation SMALLINT NOT NULL CHECK (self_evaluation BETWEEN 1 AND 5),
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_core_terms_created_at ON core_terms (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_term_id ON knowledge_nodes (term_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes (type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_tags_gin ON knowledge_nodes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_audio_repository_term_id ON audio_repository (term_id);
CREATE INDEX IF NOT EXISTS idx_audio_repository_created_at ON audio_repository (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_term_eval_term_time ON term_evaluation_history (term_id, evaluated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_knowledge_nodes_embedding_ivfflat'
  ) THEN
    CREATE INDEX idx_knowledge_nodes_embedding_ivfflat
      ON knowledge_nodes USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END $$;
