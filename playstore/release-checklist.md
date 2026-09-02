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

## Secrets GitHub Actions requis avant génération de l'AAB signé
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## Actions propriétaire obligatoires dans Google Play Console
Ces actions nécessitent le compte Google du propriétaire et ne peuvent pas être déléées au dépôt Git :
1. créer/ouvrir le compte développeur Google Play ;
2. accepter les contrats et payer les frais d'inscription si nécessaire ;
3. terminer la vérification d'identité / organisation demandée par Google ;
4. créer l'application `Mon Budget Familial` avec le package `io.github.nwodobe.monbudgetfamilial` ;
5. renseigner un e-mail public de support contrôlé par l'éditeur ;
6. téléverser le premier AAB dans un canal de test ;
7. remplir les formulaires Play Console : Data Safety, confidentialité, suppression de compte, accès à l'application, classification du contenu, public cible, publicités et fonctionnalités financières ;
8. si le compte personnel est soumis à l'exigence Google : organiser un test fermé avec au moins 12 testeurs inscrits sans interruption pendant 14 jours ;
9. après le premier téléversement, créer les abonnements Google Play : Premium mensuel 1 500 FCFA et Premium annuel 12 000 FCFA ;
10. intégrer et tester Google Play Billing avant d'activer les restrictions Premium en production ;
11. demander l'accès production et soumettre la release.

## Règle de sécurité commerciale
Ne pas verrouiller les fonctions Premium tant que Google Play Billing n'est pas connecté et testé avec les produits réels du compte Play Console.
