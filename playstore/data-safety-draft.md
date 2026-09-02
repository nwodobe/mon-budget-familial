# Brouillon Data Safety — Google Play

Ce document sert de base de saisie dans Play Console. Il doit être relu au moment de la soumission finale afin de rester strictement cohérent avec la build envoyée.

## Collecte de données

### Informations personnelles
- Adresse e-mail : collectée uniquement si l'utilisateur crée ou utilise un compte cloud.
- Finalité : authentification, sauvegarde et synchronisation du compte.
- Facultatif : oui, l'application peut fonctionner en mode local sans compte.

### Informations financières
- Revenus, dépenses, charges, budgets/enveloppes, épargne, objectifs et provisions saisis par l'utilisateur.
- Finalité : fournir les calculs et fonctionnalités de gestion budgétaire demandés par l'utilisateur et, si le cloud est activé, sauvegarder/synchroniser ces informations.
- Facultatif : l'utilisation des différentes catégories dépend des données que l'utilisateur choisit de saisir.

### Identifiants utilisateur
- Identifiant technique du compte Supabase pour isoler et synchroniser les données du bon utilisateur.
- Finalité : fonctionnement du compte et sécurité des données.

## Partage
Aucune vente de données et aucun partage à des fins publicitaires prévu.

Supabase agit comme prestataire technique d'authentification, de base de données et de synchronisation. Vérifier au moment de remplir le formulaire Google Play si ce traitement relève de la catégorie « prestataire de services » selon les définitions Data Safety alors en vigueur.

Google Play traite séparément les données de distribution et de paiement lorsque les abonnements Google Play Billing seront activés.

## Sécurité
- Données cloud transmises via HTTPS/TLS.
- Isolation par utilisateur au moyen de Row Level Security (RLS) sur la base Supabase.
- Aucune clé service-role intégrée dans le client Android.

## Suppression
- Suppression du compte disponible depuis l'application pour les utilisateurs connectés.
- URL externe : https://nwodobe.github.io/mon-budget-familial/delete-account.html
- La suppression cloud supprime le compte d'authentification et les données associées par cascade.
- Les données locales peuvent être effacées depuis l'application.

## Publicité / tracking
Aucun SDK publicitaire ou de tracking tiers actuellement présent dans la build.

## Point de contrôle avant soumission
Revalider ce formulaire si un SDK d'analytics, crash reporting, publicité, RevenueCat ou autre prestataire est ajouté avant la publication publique.
