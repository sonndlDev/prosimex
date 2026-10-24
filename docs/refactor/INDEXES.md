# INDEX RECOMMENDATIONS

---

## customer module

### Existing index assumption
The `deleted_at IS NULL` filter on `customers` is used in every query. Ensure a partial index exists:

```sql
-- If not already present:
CREATE INDEX CONCURRENTLY idx_customers_active
  ON customers (created_at DESC)
  WHERE deleted_at IS NULL;
```

**Reason:** The list query filters `c.deleted_at IS NULL` and orders by `c.created_at DESC`. A partial index on active rows sorted by created_at avoids a full-table scan for paginated list queries.

### Search filter index
When `search` is non-empty, the query uses `c.name ILIKE '%…%'` and `c.code ILIKE '%…%'`. Leading-wildcard ILIKE cannot use a standard B-tree index. If search performance is critical:

```sql
-- pg_trgm extension required:
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY idx_customers_name_trgm
  ON customers USING gin (name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_customers_code_trgm
  ON customers USING gin (code gin_trgm_ops)
  WHERE deleted_at IS NULL;
```

**Reason:** Trigram GIN indexes support ILIKE with leading wildcards.

### users batch load index
The `users.findByIds` query uses `id = ANY($1::int[])`. The `users.id` primary key index covers this — no additional index needed.
