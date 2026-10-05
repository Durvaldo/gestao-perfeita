-- SPEC-0005 (TASK-0033): phones are stored as digits only (DDD + number, no
-- country code). Strip everything that is not a digit from existing values.
-- Values that still don't have 10 or 11 digits are kept (nothing is deleted)
-- and listed as NOTICEs for manual review.

UPDATE "customers" SET "phone" = regexp_replace("phone", '\D', '', 'g') WHERE "phone" ~ '\D';
UPDATE "users" SET "phone" = regexp_replace("phone", '\D', '', 'g') WHERE "phone" ~ '\D';
UPDATE "tenants" SET "phone" = regexp_replace("phone", '\D', '', 'g') WHERE "phone" ~ '\D';

DO $$
DECLARE
  row record;
BEGIN
  FOR row IN
    SELECT 'customers' AS tbl, "id", "phone" FROM "customers" WHERE "phone" !~ '^\d{10,11}$'
    UNION ALL
    SELECT 'users', "id", "phone" FROM "users" WHERE "phone" IS NOT NULL AND "phone" !~ '^\d{10,11}$'
    UNION ALL
    SELECT 'tenants', "id", "phone" FROM "tenants" WHERE "phone" IS NOT NULL AND "phone" !~ '^\d{10,11}$'
  LOOP
    RAISE NOTICE 'Phone needs manual review: %.id=% phone=%', row.tbl, row.id, row.phone;
  END LOOP;
END $$;
