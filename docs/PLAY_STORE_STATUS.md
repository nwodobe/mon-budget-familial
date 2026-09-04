# Play Store commercialization status

## Completed in code/backend
- Android package: `io.github.nwodobe.monbudgetfamilial`
- Google Play Billing Library 9.1.0 integration
- Subscription IDs: `premium_monthly`, `premium_annual`
- Commercial targets: 1,500 FCFA/month and 12,000 FCFA/year
- Premium screen and purchase restoration
- Android-only Premium gates for reports, goals and provisions
- Server-side Google Play verification before entitlement
- Obfuscated account binding
- Server-side acknowledgement of pending subscription purchases
- RLS-protected `mbf_entitlements` table
- Privacy policy, account deletion, Data Safety and Financial Features drafts
- Signed AAB GitHub Actions workflow

## External account actions still required
- Play Console app creation / verification
- First signed AAB upload
- Subscription/base-plan/14-day offer creation
- Google Cloud service account linked to Play Console
- Supabase secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- GitHub release/signing secrets
- Internal/closed-track purchase tests
- Final Play Console declarations and production rollout
