-- 0001_init.sql
-- Idempotent. Safe to re-run. Operates only on simpinv_* objects.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS simpinv_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name  text        NOT NULL CHECK (length(trim(store_name)) > 0),
  name        text        NOT NULL CHECK (length(trim(name)) > 0),
  quantity    integer     NOT NULL CHECK (quantity > 0),
  amount      numeric(10, 2)       CHECK (amount IS NULL OR amount > 0),
  unit        text                 CHECK (unit IS NULL OR unit IN ('g', 'mg', 'mL', 'L', 'pcs', 'pack', 'sachet')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((amount IS NULL AND unit IS NULL) OR (amount IS NOT NULL AND unit IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS simpinv_items_store_lower_idx
  ON simpinv_items (lower(store_name), lower(name));

CREATE OR REPLACE FUNCTION simpinv_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS simpinv_items_set_updated_at ON simpinv_items;
CREATE TRIGGER simpinv_items_set_updated_at
  BEFORE UPDATE ON simpinv_items
  FOR EACH ROW EXECUTE FUNCTION simpinv_set_updated_at();
