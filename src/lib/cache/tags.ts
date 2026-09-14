/**
 * Central place for cache tag names, so a read and the write that should
 * invalidate it can never drift apart from a typo in a hand-typed string.
 *
 * One tag per table, per user. A cached read is tagged with every table its
 * result depends on — including tables it only reads *through a join*, e.g.
 * a load's embedded company/party name — and a write invalidates the tag
 * for every table it touches. When in doubt, a read gets tagged with more
 * tables, not fewer: over-invalidating just means an extra cache miss;
 * under-invalidating means a stale number on screen, which is the one
 * outcome this exists to rule out.
 *
 * `revalidateTag(tag, { expire: 0 })` is used everywhere (not the "max"
 * stale-while-revalidate profile Next.js recommends for most content) —
 * this is bookkeeping data, so the next read after a write must be exact,
 * never a fast-but-stale one.
 */
export const cacheTags = {
  profile: (userId: string) => `profile:${userId}`,
  companies: (userId: string) => `companies:${userId}`,
  parties: (userId: string) => `parties:${userId}`,
  loads: (userId: string) => `loads:${userId}`,
  payments: (userId: string) => `payments:${userId}`,
};

/**
 * Safety-net TTL for every cached read, in seconds. Tag-based invalidation
 * is what keeps data correct after a write; this is only a backstop in
 * case a tag was ever missed, so any staleness self-heals within a minute
 * instead of persisting indefinitely.
 */
export const CACHE_TTL_SECONDS = 60;
