# verify-play-purchase

This authenticated Edge Function verifies Android subscription purchase tokens against Google Play Developer API before writing Premium entitlement.

Required runtime secret:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: JSON for a Google Cloud service account linked to the Play Console app and authorized for the minimum Android Publisher subscription/order permissions.

The secret must be configured in Supabase project settings and must never be committed to Git.

The function binds purchases to the signed-in Supabase user using a SHA-256 obfuscated account ID, validates product/state/expiry, acknowledges pending subscriptions server-side, and stores only a SHA-256 hash of the purchase token.
