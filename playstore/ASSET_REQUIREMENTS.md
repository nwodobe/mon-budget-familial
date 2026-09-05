# Assets Google Play — formats attendus

Ce dossier documente les formats à préparer pour la fiche Google Play de **Mon Budget Familial**.

## Icône de fiche

- fichier recommandé : `public/icon-512.png`
- dimensions : **512 × 512 px**
- format : **PNG 32 bits (RGBA)**
- taille maximale : **1 024 Ko**

## Graphique de présentation

- dimensions obligatoires : **1 024 × 500 px**
- formats acceptés : **JPEG** ou **PNG 24 bits (sans canal alpha)**
- usage : graphique de présentation de la fiche Play Store

## Captures d’écran téléphone

- minimum à fournir : **2 captures d’écran téléphone**
- formats acceptés : **JPEG** ou **PNG 24 bits (sans canal alpha)**
- dimension minimale d’un côté : **320 px**
- dimension maximale d’un côté : **3 840 px**
- le côté le plus long ne doit pas dépasser **2 fois** le côté le plus court
- utiliser des captures réelles de l’application, pas des maquettes trompeuses

## Jeu de fichiers recommandé

```text
playstore/assets/
  feature-graphic-1024x500.png
  phone-01-dashboard.png
  phone-02-budget.png
```

Le graphique de présentation et les captures d’écran ne sont pas générés automatiquement par `scripts/make-icons.mjs` afin d’éviter de publier des visuels factices ou non représentatifs de l’application réelle.
