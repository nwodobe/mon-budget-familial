# Déploiement des Edge Functions Google Play / compte

Les fonctions `delete-account` et `verify-play-purchase` doivent rester protégées par la vérification JWT de Supabase.

Projet Supabase de **Mon Budget Familial** : `dldcstmgxklumcvynlou`.

> État vérifié le 5 septembre 2026 : les deux fonctions sont déjà `ACTIVE` sur ce projet et `verify_jwt=true`. Le workflow ci-dessous sert à rendre leur redéploiement reproductible depuis GitHub sans commiter de secret.

## 1. Créer `SUPABASE_ACCESS_TOKEN`

1. Connectez-vous au Dashboard Supabase avec le compte propriétaire du projet.
2. Ouvrez le menu du compte, puis **Account Settings → Access Tokens**.
3. Cliquez sur **Generate new token**.
4. Donnez-lui un nom explicite, par exemple `github-mon-budget-familial-functions`.
5. Copiez le token lorsqu'il est affiché. Ne le placez dans aucun fichier du dépôt.
6. Dans GitHub : dépôt `nwodobe/mon-budget-familial` → **Settings → Secrets and variables → Actions → New repository secret**.
7. Nom : `SUPABASE_ACCESS_TOKEN`.
8. Valeur : le token Supabase copié à l'étape 5.

Le workflow `.github/workflows/deploy-supabase-functions.yml` peut ensuite être lancé manuellement depuis **Actions → Deploy Supabase Edge Functions → Run workflow**.

## 2. Déploiement par GitHub Actions

Le workflow exécute :

```bash
supabase functions deploy delete-account --project-ref dldcstmgxklumcvynlou
supabase functions deploy verify-play-purchase --project-ref dldcstmgxklumcvynlou
```

Avec la CLI Supabase actuelle, la vérification JWT est activée par défaut. Le flag disponible est `--no-verify-jwt` pour la désactiver ; il n'est volontairement jamais utilisé ici. Les fonctions sont donc déployées avec vérification JWT active.

## 3. Procédure de repli depuis le Dashboard Supabase, sans CLI

Si GitHub Actions ou la CLI ne sont pas utilisables :

1. Ouvrez le projet Supabase `dldcstmgxklumcvynlou`.
2. Allez dans **Edge Functions**.
3. Ouvrez `delete-account` (ou créez-la si elle a été supprimée).
4. Remplacez le contenu de `index.ts` par le fichier versionné `supabase/functions/delete-account/index.ts`.
5. Vérifiez que l'option de vérification JWT est activée, puis déployez la fonction.
6. Répétez pour `verify-play-purchase` avec `supabase/functions/verify-play-purchase/index.ts`.
7. Revenez à la liste des fonctions et vérifiez pour chacune : **status = ACTIVE** et **verify_jwt = true**.

Ne collez jamais `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ou un autre secret dans le code de la fonction : les secrets doivent rester dans la gestion des secrets Supabase.

## 4. Test après déploiement

### Test A — appel non authentifié : doit être refusé

```bash
curl -i -X POST \
  https://dldcstmgxklumcvynlou.supabase.co/functions/v1/delete-account \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Résultat attendu : **HTTP 401** (ou refus équivalent par la passerelle JWT). Le compte ne doit évidemment pas être supprimé.

### Test B — appel authentifié : doit supprimer un compte de test

Utilisez uniquement un **compte de test jetable**, jamais votre compte principal.

1. Créez un utilisateur de test dans **Authentication → Users** ou via l'application.
2. Ajoutez quelques données de test dans l'application et synchronisez-les.
3. Récupérez le JWT de session de ce compte de test.
4. Lancez :

```bash
curl -i -X POST \
  https://dldcstmgxklumcvynlou.supabase.co/functions/v1/delete-account \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TEST_USER_JWT>' \
  -H 'apikey: <VITE_SUPABASE_ANON_KEY>' \
  -d '{}'
```

Résultat attendu : **HTTP 200** avec `{"ok":true}`.

5. Dans **Authentication → Users**, vérifiez que l'utilisateur de test n'existe plus.
6. Dans le Table Editor ou SQL Editor, vérifiez qu'aucune ligne `mbf_*` ne subsiste pour son ancien `user_id`. Les migrations du projet référencent `auth.users(id)` avec `ON DELETE CASCADE`, ce qui assure cette suppression en cascade.

## 5. Secret Google Play côté Supabase

`verify-play-purchase` a une dépendance supplémentaire : le secret Supabase `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Il est distinct de `SUPABASE_ACCESS_TOKEN` et des secrets de build GitHub. Sans lui, la fonction renvoie `503 google_play_not_configured`.
