# Tickets jusqu'au MVP

Projet : Balade (nom de code), app Expo / React Native en TypeScript. Le contexte complet, la DA et les règles sont dans CLAUDE.md à la racine. Le lire avant chaque ticket.

Règles pour chaque ticket : un ticket à la fois, rien en dehors de son périmètre, expliquer en quelques lignes ce qui a été fait, ne commiter qu'après validation sur l'iPhone, puis cocher la case ici.

## Avancement

Les numéros restent fixes, mais l'ordre à suivre est celui de cette liste : le compte étant obligatoire, T12 et T13 passent avant la build de développement.

- [x] Base visuelle (thème, police, 4 onglets)
- [x] Composant de carte de lieu (face, dos, retournement)
- [x] Carte centrée sur la position
- [x] Prototype de tracé (à retirer au T01)
- [x] T01 Base locale et suivi continu
- [x] T02 Les 20 lieux
- [x] T03 Déblocage
- [x] T04 Album
- [x] T05 Lieux sur la carte
- [x] T12 Comptes Supabase
- [x] T06 Écran d'accueil, connexion et consentement
- [x] T13 Synchronisation
- [x] T07 Trajets du jour
- [ ] T08 Build de développement
- [ ] T09 Suivi en arrière-plan
- [ ] T10 Test batterie
- [ ] T11 Pas
- [ ] T14 Illustrations
- [x] T15 Vernis et retournement
- [x] T16 Profil (pas en attente du T11)
- [ ] T17 Finitions et essai terrain

---

# Phase A : Expo Go, app ouverte

Objectif de la phase : débloquer La Défense le 12 novembre.

## T01 Base locale et suivi continu

Objectif : enregistrer la position en continu dans une base sur le téléphone, sans bouton.

À faire :
- Installer expo-sqlite. Créer un module `src/db/` qui ouvre la base et crée les tables au démarrage.
- Table `points` : id, latitude, longitude, precision_m, horodatage.
- Table `cartes_debloquees` : lieu_id (unique), debloquee_le.
- Suivre la position avec expo-location tant que l'app est ouverte : un point toutes les 10 secondes ou tous les 15 mètres. Ignorer les points dont la précision dépasse 30 m.
- Retirer le bouton « Démarrer / Terminer une balade » et son résumé.
- Garder sur la carte le tracé des points de la journée, en encre.

Fini quand : l'app enregistre seule, les points survivent à la fermeture complète de l'app, plus aucun bouton de balade.

## T02 Les 20 lieux

Objectif : avoir les données des 20 lieux du MVP.

À faire :
- Compléter `src/cartes/lieux.ts` : id, nom, categorie, latitude, longitude, rayon_m, adresse, anecdote.
- Vérifier chaque coordonnée avec OpenStreetMap. Les valeurs ci-dessous sont approximatives.
- Anecdote : une ou deux phrases, un fait réel et vérifiable. En cas de doute, laisser vide plutôt qu'inventer.
- Numéroter les cartes de 001 à 020 dans l'ordre du tableau.
- Pour chaque catégorie, une illustration de remplacement neutre quand `assets/illustrations/<id>.svg` manque.

| id | Nom | Catégorie | Lat | Lon | Rayon |
| --- | --- | --- | --- | --- | --- |
| tour-eiffel | Tour Eiffel | culture | 48.8584 | 2.2945 | 120 |
| arc-de-triomphe | Arc de Triomphe | culture | 48.8738 | 2.2950 | 100 |
| louvre | Louvre | culture | 48.8610 | 2.3358 | 200 |
| notre-dame | Notre-Dame | culture | 48.8530 | 2.3499 | 120 |
| sacre-coeur | Sacré-Cœur | culture | 48.8867 | 2.3431 | 100 |
| pantheon | Panthéon | culture | 48.8462 | 2.3464 | 100 |
| chateau-de-vincennes | Château de Vincennes | culture | 48.8429 | 2.4358 | 200 |
| gare-du-nord | Gare du Nord | lieux de vie | 48.8809 | 2.3553 | 150 |
| gare-de-lyon | Gare de Lyon | lieux de vie | 48.8443 | 2.3744 | 150 |
| parc-des-princes | Parc des Princes | lieux de vie | 48.8414 | 2.2530 | 150 |
| forum-des-halles | Westfield Forum des Halles | lieux de vie | 48.8625 | 2.3470 | 150 |
| les-4-temps | Westfield Les 4 Temps | lieux de vie | 48.8905 | 2.2400 | 150 |
| jardin-du-luxembourg | Jardin du Luxembourg | nature | 48.8462 | 2.3372 | 300 |
| buttes-chaumont | Buttes-Chaumont | nature | 48.8809 | 2.3825 | 300 |
| bois-de-boulogne | Bois de Boulogne | nature | 48.8625 | 2.2490 | 1500 |
| ile-aux-cygnes | Île aux Cygnes | nature | 48.8530 | 2.2860 | 300 |
| la-defense | La Défense | quartier | 48.8918 | 2.2380 | 600 |
| le-marais | Le Marais | quartier | 48.8590 | 2.3600 | 600 |
| montmartre | Montmartre | quartier | 48.8865 | 2.3405 | 500 |
| belleville | Belleville | quartier | 48.8720 | 2.3770 | 500 |

Fini quand : les 20 lieux existent avec des coordonnées vérifiées et apparaissent tous dans le code sans erreur de typage.

## T03 Déblocage

Objectif : entrer dans le rayon d'un lieu débloque sa carte.

À faire :
- À chaque nouveau point, calculer la distance aux lieux non débloqués. Dans le rayon : écrire dans `cartes_debloquees` avec la date. Une seule fois par lieu.
- Écran « Nouvelle carte » en plein écran : fond assombri, la carte apparaît face cachée puis se retourne, vibration légère (expo-haptics). Bouton pour fermer. Si plusieurs lieux se débloquent ensemble, les montrer l'un après l'autre.
- Le tampon « Validé » du dos affiche la vraie date de déblocage.
- Uniquement en mode développement : un menu caché pour simuler ma position sur un lieu, afin de tester sans me déplacer. Absent de la version finale.

Fini quand : en simulant la position de La Défense, la carte se débloque, l'écran s'affiche, et le déblocage survit à la fermeture de l'app.

## T04 Album

Objectif : voir sa collection.

À faire :
- Onglet Album : grille des 20 emplacements, dans l'ordre des numéros.
- Débloquée : la carte en couleur, tap pour la voir en grand et la retourner.
- Pas encore débloquée : dos de carte uni avec la couleur de sa catégorie, le numéro, et un point d'interrogation à la place du nom.
- En haut : compteur « 3 / 20 » et filtre par catégorie.

Fini quand : l'album reflète exactement les cartes débloquées.

## T05 Lieux sur la carte

Objectif : savoir où aller.

À faire :
- Un marqueur rond par lieu, à la couleur de sa catégorie, contour encre. Vide si non débloqué, plein si débloqué.
- Tap sur un marqueur : nom et distance si non débloqué, carte si débloqué.

Fini quand : les 20 marqueurs s'affichent au bon endroit.

---

# Phase B : compte et vraie app

Objectif de la phase : un compte obligatoire, des données sauvegardées, et plus besoin de garder l'app ouverte.

## T12 Comptes Supabase

Inscription et connexion par e-mail. Tables côté Supabase avec sécurité au niveau des lignes activée partout : chaque utilisateur ne lit et n'écrit que ses données. Seule la clé publique dans l'app, via variables d'environnement. Le compte est obligatoire. L'app marche sans réseau et synchronise dès qu'il revient.

Fini quand : deux comptes de test ne voient jamais les données l'un de l'autre.

## T06 Écran d'accueil, connexion et consentement

Au premier lancement : deux ou trois écrans qui expliquent le principe et le suivi continu. Puis création de compte ou connexion (le compte est obligatoire, voir T12). Puis demande des autorisations de localisation. Un refus mène à un écran clair avec un bouton vers les réglages. Tant qu'on n'est pas connecté, pas d'accès à l'app.

Fini quand : à la réinstallation, l'accueil et la connexion s'affichent, puis plus jamais tant qu'on reste connecté.

## T13 Synchronisation

Envoyer les cartes débloquées et les points vers le compte dès qu'il y a du réseau, et les récupérer à la connexion sur un nouveau téléphone. Le téléphone reste la source principale.

Fini quand : après réinstallation et connexion, l'album est identique.

## T07 Trajets du jour

Découper les points en trajets : nouveau trajet après 10 minutes sans mouvement. Afficher sur la carte les trajets du jour, et pouvoir revenir aux jours précédents.

Fini quand : une journée avec plusieurs sorties montre plusieurs trajets séparés.

## T08 Build de développement

Configurer une build de développement iOS compilée par GitHub Actions, sans Mac, et documenter l'installation avec SideStore. Vérifier que tout ce qui marche dans Expo Go marche dans la build.

Fini quand : l'app s'installe sur l'iPhone sans Expo Go et se connecte au serveur de dev.

## T09 Suivi en arrière-plan

Suivi app fermée, économe : réveil par changements de position importants, GPS fin seulement pendant la marche, coupé à l'arrêt. Déblocage en arrière-plan avec notification locale « Nouvelle carte : … ».

Fini quand : une carte se débloque téléphone dans la poche, app fermée.

## T10 Test batterie

Une semaine d'usage réel. Noter la consommation dans les réglages de l'iPhone. Ajuster les intervalles si l'app dépasse quelques pourcents par jour.

Fini quand : la consommation est jugée acceptable par Enzo.

## T11 Pas

Lire les pas du jour depuis Santé sur iPhone, Health Connect sur Android. Les afficher dans le Profil.

Fini quand : le compteur correspond à celui de l'app Santé.

---

# Phase C : finitions

Objectif de la phase : une app propre qu'on peut montrer.

## T14 Illustrations

Les 18 illustrations manquantes, dans le style validé (voir CLAUDE.md), en SVG simple sans filtres, nommées `<id>.svg`.

Fini quand : plus aucune illustration de remplacement dans l'album.

## T15 Vernis et retournement

Le reflet de la carte suit l'inclinaison du téléphone (expo-sensors). Retournement en 3D fluide.

Fini quand : incliner le téléphone fait glisser le reflet.

## T16 Profil

Nombre de cartes, kilomètres parcourus, pas du jour et total, dernières cartes débloquées.

Fini quand : les chiffres correspondent aux données réelles.

## T17 Finitions et essai terrain

Icône, écran de démarrage, nom définitif si trouvé. Puis une vraie journée dans Paris pour débloquer un maximum de cartes et noter les bugs.

Fini quand : la journée de test se passe sans blocage.
