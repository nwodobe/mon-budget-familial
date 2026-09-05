# Déploiement de la fonction `delete-account`

La fonction est appelée par `src/ui/DeleteAccount.tsx` et doit être déployée avec vérification JWT activée.

## Pré-requis

- projet Supabase : `dldcstmgxklumcvynlou`
- CLI Supabase installée et authentifiée
- projet lié localement au bon ref Supabase

## Déploiement

Depuis la racine du dépôt :

```bash
supabase functions deploy delete-account --project-ref dldcstmgxklumcvynlou --verify-jwt
```

La fonction utilise les secrets Supabase fournis automatiquement au runtime :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Aucun de ces secrets ne doit être commité dans Git.

## Comportement attendu

1. le JWT du client est vérifié ;
2. la session utilisateur est revalidée avec `auth.getUser()` ;
3. l’utilisateur Auth courant est supprimé via la clé service role ;
4. les tables `public.mbf_*` sont supprimées en cascade grâce aux clés étrangères `ON DELETE CASCADE` vers `auth.users(id)` définies dans les migrations ;
5. la fonction retourne `{ "ok": true }` en cas de succès.

## Vérification après déploiement

Dans Supabase Dashboard → Edge Functions → `delete-account` :

- statut : `ACTIVE`
- `verify_jwt` : `true`

Un appel non authentifié doit être refusé. Un appel authentifié depuis l’écran de suppression doit supprimer le compte puis les données cloud liées.
