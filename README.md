# Mon Budget Familial

**En ligne : https://nwodobe.github.io/mon-budget-familial/**

Application web installable (PWA) de pilotage du budget familial, en FCFA (XOF).

Elle ne cherche pas a etre un carnet de depenses de plus. Elle repond chaque jour a une seule
question :

> Combien puis-je encore depenser sans mettre en danger mes charges, mon epargne et mes objectifs ?

## Le cycle

```
REVENUS -> CHARGES OBLIGATOIRES -> EPARGNE -> DISPONIBLE -> DEPENSES -> CONTROLE -> ANALYSE
```

## Les trois chiffres qui changent un comportement

| Chiffre | Ce qu'il dit |
| --- | --- |
| **Disponible a depenser** | Ce qui reste apres charges a payer et epargne reservee |
| **Budget quotidien conseille** | Le disponible etale sur les jours restants du mois |
| **Score de discipline** | Une note sur 100, dont chaque point est explique |

## Regle de calcul centrale

```
disponible = revenus
           - depenses deja enregistrees
           - epargne deja versee
           - charges du mois restant a payer
           - epargne restant a mettre de cote
```

Chaque somme sort **une fois et une seule**. Quand une charge est reglee, elle quitte les
engagements et entre dans les depenses : le disponible ne bouge pas. Meme regle pour l'epargne.
C'est le piege classique de ce genre d'application, et il est couvert par des tests dedies.

Le budget quotidien est arrondi **vers le bas** : promettre un franc de plus par jour ferait
terminer le mois a decouvert.

## Fonctionnalites

- Tableau de bord : disponible, budget quotidien, etat de sante, rythme observe
- Revenus multi-sources, avec epargne recommandee affichee a la saisie
- Enveloppes budgetaires, avec redefinition possible mois par mois
- Saisie de depense rapide, avec **alerte avant validation** en cas de depassement
- Charges obligatoires : echeancier, periodicites, retards, reglement en un geste
- Epargne : taux minimum, poches, depots et retraits
- Objectifs financiers : effort mensuel necessaire calcule automatiquement
- Score de discipline transparent, composante par composante
- Rapports hebdomadaire et mensuel, avec conclusion redigee
- Historique filtrable, export CSV, export du rapport, sauvegarde JSON
- Fonctionnement hors connexion, synchronisation Supabase anti-doublon
- Code PIN local, masquage des montants

## Securite

- Row Level Security sur **toutes** les tables : `auth.uid() = user_id`, en lecture comme en
  ecriture, avec `force row level security` et aucun acces `anon`.
- L'application **refuse de demarrer** si une cle `service_role` est trouvee cote navigateur
  (`src/data/supabase.ts`).
- Le service worker ne met **jamais** en cache les reponses du backend financier
  (`public/sw.js`).
- Le code PIN n'est pas stocke : seul un condensat PBKDF2-SHA256 a 200 000 iterations l'est.
- La deconnexion est de portee `local` : elle ne revoque pas les sessions des autres appareils.
- En-tetes de securite et CSP restrictive dans `netlify.toml`.

## Architecture

```
src/domain/    Moteur financier deterministe (aucun acces reseau, horloge ni stockage)
src/data/      Persistance locale, synchronisation, PIN, exports
src/state/     Etat applicatif React
src/ui/        Ecrans
supabase/      Migration SQL : schema, index, RLS
```

Le moteur est une bibliotheque de fonctions pures : les memes arguments rendent toujours le
meme resultat. C'est ce qui le rend testable ligne a ligne, et c'est pourquoi aucun calcul
financier n'est confie a une couche approximative.

## Developpement

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # tests du moteur et de la synchronisation
npm run typecheck
npm run build
```

## Configuration du backend

Copier `.env.example` vers `.env` et renseigner :

```
VITE_SUPABASE_URL=https://VOTRE-REF.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Sans ces variables, l'application fonctionne en **local seul** : elle reste pleinement
utilisable, mais rien n'est sauvegarde hors de l'appareil.

Appliquer ensuite `supabase/migrations/0001_schema_budget_familial.sql` sur le projet.

Le backend en service est le projet `dldcstmgxklumcvynlou`, region eu-west-3, dans
l'organisation personnelle « Mon Budget Familial » (plan free). Seule la cle **publishable** est
embarquee dans le bundle : elle est publique par nature, et la protection repose sur la RLS et
sur les privileges, verifies par appel reel — un anonyme recoit `401 / 42501 permission denied`.

## Deploiement

Le site est publie par **GitHub Pages depuis la branche `gh-pages`**, en mode « legacy » : la
branche contient deja le site construit, GitHub ne lance aucune compilation et **aucune minute
GitHub Actions n'est consommee**.

Pour republier apres une modification :

```bash
APP_BASE=/mon-budget-familial/ npm run build   # chemins prefixes pour le sous-repertoire
# copier dist/ dans un dossier de travail, y ajouter .nojekyll et 404.html,
# puis pousser ce dossier sur la branche gh-pages
```

`APP_BASE` est essentiel : GitHub Pages sert le site depuis un sous-repertoire, et des chemins
absolus mettraient le service worker hors de sa portee et rendraient le manifeste introuvable.
Sans cette variable, la base vaut `/`, ce qui convient a un deploiement a la racine d'un domaine
(Netlify, `netlify.toml` fourni).

## Etat des controles

Verifie par execution le 30 aout 2026 :

- 50 tests automatises verts (moteur financier, calendrier, score, synchronisation)
- `tsc --noEmit` sans erreur
- Build de production sans erreur
- Parcours complet execute dans le navigateur : salaire 1 500 000 -> loyer 300 000 + ecole
  150 000 -> epargne 225 000 -> depenses -> disponible recalcule a chaque etape
