# Billing security invariants

1. The Android client never grants Premium by itself.
2. Purchase tokens are sent over authenticated Supabase Edge Function calls.
3. Google Play Developer API verification is mandatory before entitlement.
4. Purchase is bound to the signed-in account through SHA-256 `obfuscatedAccountId`.
5. Raw purchase tokens are not stored in Postgres; only SHA-256 hashes are persisted.
6. Authenticated clients can read only their own entitlement and cannot write entitlement rows.
7. Service-role and Google service-account credentials stay server-side only.
8. On-hold, paused, pending and expired subscriptions do not grant Premium.
9. Active, grace-period, and canceled-but-not-yet-expired subscriptions retain access until expiry.
