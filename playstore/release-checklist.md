# Checklist de publication Google Play — Mon Budget Familial

## Déjà préparé dans le dépôt
- [x] applicationId stable : `io.github.nwodobe.monbudgetfamilial`
- [x] versionCode : 1
- [x] versionName : 1.0.0
- [x] target / compile SDK 36 via configuration Android du projet
- [x] génération AAB Release prévue
- [x] signature Release par secrets, jamais par clé committée dans Git
- [x] variables Supabase injectées au build Android Release
- [x] politique de confidentialité publique
- [x] page publique de suppression de compte
- [x] suppression de compte authentifiée côté Supabase
- [x] fiche Play Store française préparée
- [x] brouillon Data Safety préparé
- [x] brouillon déclaration des fonctionnalités financières préparé
- [x] workflow manuel de redéploiement des Edge Functions Supabase
- [x] génération et vérification des assets principaux de fiche Play

## État Google Play Console confirmé
- [x] application créée dans Play Console — app ID `4972041473726905325`
- [x] package définitif `io.github.nwodobe.monbudgetfamilial`
- [x] langue par défaut `fr-FR`
- [x] type `Appli`, tarification `Sans frais`
- [x] package enregistré pour la Validation des développeurs Android
- [x] Conditions du service Signature d'application Play acceptées
- [x] Play App Signing activé : le keystore local sert de clé d'upload
- [ ] premier AAB téléversé sur un canal de test

## Secrets GitHub Actions requis avant génération de l'AAB signé
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `SUPABASE_ACCESS_TOKEN` pour le workflow manuel de déploiement des Edge Functions

## Secret Supabase requis pour Google Play Billing
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — JSON complet du service account Google Play Android Publisher, stocké dans les secrets Supabase et jamais dans GitHub ou le dépôt.

Sans `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `verify-play-purchase` renvoie `503 google_play_not_configured` et aucun achat Google Play ne peut être validé côté serveur.

## Actions propriétaire obligatoires dans Google Play Console
1. renseigner une adresse e-mail publique de support contrôlée par l'éditeur et remplacer le marqueur `[[À REMPLIR : votre adresse e-mail de support]]` dans les fichiers de fiche publique ;
2. enregistrer les secrets GitHub nécessaires au build AAB ;
3. générer puis téléverser le premier AAB dans un canal de test ;
4. finaliser les formulaires Play Console : Data Safety, confidentialité, suppression de compte, accès à l'application, classification du contenu, public cible, publicités et fonctionnalités financières ;
5. après le premier AAB, créer les abonnements `premium_monthly` et `premium_annual`, leurs base plans et l'offre `trial-14d` ;
6. créer/autoriser le service account Google Play Android Publisher et enregistrer son JSON comme secret Supabase `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ;
7. configurer les testeurs sous licence pour les tests Billing ;
8. **compte développeur personnel : mener un test fermé avec au moins 12 testeurs inscrits sans interruption pendant 14 jours** ;
9. tester achat mensuel, achat annuel, essai gratuit, acknowledgement serveur, restauration et annulation avec des testeurs sous licence ;
10. à l'issue des 14 jours, demander l'accès production dans Play Console ;
11. soumettre la release production uniquement après validation de tous les tests.

## Chemin critique
Le chemin critique n'est plus le code applicatif : c'est le **test fermé 12 testeurs / 14 jours continus**, exigé pour ce compte personnel avant l'accès production.

## Règle de sécurité commerciale
Ne pas considérer le Premium prêt pour production tant que les produits Google Play et la vérification serveur via `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` n'ont pas été testés de bout en bout.
