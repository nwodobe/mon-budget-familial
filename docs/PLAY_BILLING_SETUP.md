# Google Play Billing — final account setup

The application code and Supabase validation layer are prepared for these subscription IDs:

- `premium_monthly` — target retail price: 1,500 FCFA/month
- `premium_annual` — target retail price: 12,000 FCFA/year

## Required Play Console configuration

1. Create the Android app with package `io.github.nwodobe.monbudgetfamilial`.
2. Upload the first signed AAB.
3. Create the two subscription products above and activate their base plans.
4. Add a 14-day trial offer if desired.
5. Link a Google Cloud service account to Play Console with the minimum subscription/order permissions required for Android Publisher API verification.
6. Store the complete service-account JSON as Supabase Edge Function secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Never commit it to Git.
7. Test purchase, renewal, cancellation, grace period and restoration using Play license testers / an internal or closed track.

## GitHub release secrets

The release workflow expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable/anon client key only)
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit the keystore or passwords to the repository.
