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
- [ ] T09 Suivi en arrière-plan (codé, à tester avec la build)
- [ ] T10 Test batterie
- [x] T11 Pas (compteur du téléphone, 7 jours recopiés chaque jour)
- [x] T14 Illustrations
- [x] T15 Vernis et retournement
- [x] T16 Profil
- [ ] T17 Finitions et essai terrain

Phase D, rues et carte maison (marche dans Expo Go, à faire avant T08 au choix d'Enzo) :

- [x] T18 Données des rues
- [ ] T19 Recalage sur les rues
- [ ] T20 Carte maison
- [ ] T21 Pourcentages de rues
- [ ] T22 Synchroniser les rues, plus les points

Phase E, interface et jeu (testable chez soi, priorité d'Enzo à partir du 16 novembre 2026) :

- [x] T23 Les 100 lieux
- [x] T24 Les timbres
- [ ] T25 L'album en carnet de timbres
- [ ] T26 Visibilité : visibles, indices, secrets, légendaires
- [ ] T27 Les défis
- [ ] T28 Notifications des défis
- [x] T29 Profil : username, bio, photo
- [ ] T30 Les trois vues de l'accueil (après T20)
- [ ] T31 Bug : position GPS bloquée sur « recherche en cours » dehors
- [ ] T32 Paramètres
- [ ] T33 Amis

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

---

# Phase D : rues et carte maison

Objectif de la phase : n'afficher que les rues parcourues, sur une carte dessinée par nous, sans dépendre d'Apple ni de Google.

Principe décidé avec Enzo :
- Seules les rues comptent. Une position est rattachée à la rue la plus proche. Hors des rues, elle n'est jamais affichée : soit elle sert à débloquer un lieu, soit elle est ignorée. Domicile, bureau et autres endroits privés disparaissent ainsi de la carte.
- Les allées et chemins des parcs présents dans OpenStreetMap comptent comme des rues. Un parc sans chemin est traité comme un lieu.
- Un seul jeu de données, embarqué dans l'app, sert au recalage, à la carte et aux pourcentages. Tout le calcul se fait sur le téléphone.
- Mention obligatoire « © contributeurs OpenStreetMap » dans l'app (données sous licence ODbL).

## T18 Données des rues

Objectif : embarquer le réseau de rues de la petite couronne : Paris, Hauts-de-Seine, Seine-Saint-Denis et Val-de-Marne.

À faire :
- Un script `scripts/rues/` (Node), relançable, qui récupère les données OpenStreetMap de la zone. Source par défaut : l'extrait Geofabrik de l'Île-de-France (un fichier .osm.pbf). L'API Overpass reste en option, car elle est souvent surchargée.
- La zone suit les limites réelles des quatre départements, pas un rectangle. Une rue est gardée si son milieu est dans un arrondissement de Paris ou une commune du 92, du 93 ou du 94, reconnus par leur code INSEE.
- Garder les voies où l'on marche : residential, living_street, pedestrian, footway, path, steps, primary, secondary, tertiary, unclassified, cycleway. Exclure motorway, trunk et leurs bretelles (périphérique, autoroutes), les voies privées (access=private) et les allées de parking.
- Exclure aussi les doublons de rue : trottoirs (footway=sidewalk), passages piétons (footway=crossing) et pistes cyclables dessinées à part, sauf dans les parcs et les bois où elles servent de chemins. Chaque rue n'existe qu'une fois, un seul passage la valide, à pied ou à vélo, quel que soit le côté.
- Garder aussi, pour le dessin : la Seine et les plans d'eau, les parcs et bois, les contours des arrondissements et des communes.
- Produire des fichiers compacts dans `assets/data/` : segments de rue (identifiant, nom, type, coordonnées simplifiées), plus un index par grille pour retrouver vite les segments proches d'un point. Viser moins de 10 Mo au total. Au-delà, découper par département et charger à la demande.
- Charger ces fichiers au démarrage sans bloquer l'interface (expo-asset et expo-file-system, pas un gros require).
- Écrire dans le ticket la taille obtenue et le nombre de segments.

Fini quand : l'app charge le réseau en moins de deux secondes sur l'iPhone et peut répondre « quels segments à moins de 25 m de ce point ».

Résultat (extrait Geofabrik Île-de-France du 14 novembre 2026) : 267 888 segments, 20 542 noms de rues, 142 zones (20 arrondissements, 36 communes du 92, 39 du 93 depuis la fusion de Saint-Denis et Pierrefitte en 2025, 47 du 94). 9,43 Mo au total : rues.bin 8,40 Mo, rues-noms.txt 0,39 Mo, fond.bin 0,64 Mo, zones.txt 3 Ko. 269 pistes cyclables gardées dans les parcs et bois, 7 501 exclues. Coordonnées précises à 0,6 m près. Relancer avec `node scripts/rues/generer.mjs`, ou `--source=overpass`.

## T19 Recalage sur les rues

Objectif : transformer les positions en rues parcourues.

À faire :
- Pour chaque nouveau point : chercher les segments à moins de 25 m. Choisir le plus proche en favorisant la continuité avec le segment précédent, pour ne pas sauter sur une rue parallèle. À distance presque égale, préférer une rue nommée à un chemin sans nom, et une rue à un trottoir resté dans les données.
- Aucun segment assez proche : le point n'est jamais affiché. Il sert uniquement à vérifier le déblocage des lieux.
- Nouvelle table `rues_parcourues` : segment_id, premiere_fois, derniere_fois, nb_passages.
- Recaler aussi les points déjà enregistrés, une fois, au premier lancement après la mise à jour.
- Les trajets du jour (T07) affichent désormais les segments recalés, plus les points bruts.
- Validé par Enzo : supprimer les points bruts du téléphone au bout de 7 jours, seulement s'ils sont recalés et déjà sauvegardés sur le compte. La distance de chaque journée est figée juste avant (table `distances_jour`), pour que les kilomètres du Profil ne baissent pas.
- Table `passages` (segment, jour, heure) pour redessiner les journées passées sans les points bruts. Elle reste sur le téléphone.
- Une rue ne compte que si l'on avance le long d'elle : deux points de suite avec 10 m de progression, ou le passage vers une rue reliée. En plus, rien n'est validé sans vrai déplacement : sur les 8 derniers points, au moins 50 m d'éloignement, et au moins 60 % du chemin suivi. Les petits segments sautés entre deux points sont comblés par le plus court chemin, jusqu'à 60 m.

Fini quand : une marche dans le quartier s'affiche collée aux rues, et un passage chez soi ou dans un bâtiment n'apparaît nulle part.

## T20 Carte maison

Objectif : remplacer la carte Apple par une carte dessinée par nous, à notre style.

À faire :
- Dessin avec @shopify/react-native-skia, gestes avec react-native-gesture-handler et react-native-reanimated (installer avec `npx expo install`, versions compatibles avec Expo Go).
- Rendu : fond crème, Seine et plans d'eau en cobalt adouci, parcs en vert bouteille pâle, rues en traits fins d'encre (plus épais pour les grands axes), rues parcourues en ocre épais par-dessus, marqueurs des lieux, point de position.
- Pas de noms de rues pour l'instant. Seulement les noms de quartiers à faible zoom.
- Déplacer, zoomer à deux doigts, bouton pour se recentrer.
- Performance : ne dessiner que les segments visibles (grâce à l'index du T18), simplifier selon le zoom, masquer les petites voies à faible zoom. Objectif : fluide sur l'iPhone d'Enzo.
- Garder l'ancienne carte Apple derrière un réglage de développement tant que la nouvelle n'est pas validée.

Fini quand : Enzo navigue dans Paris sur la carte maison sans saccade et y voit ses rues parcourues.

## T21 Pourcentages de rues

Objectif : savoir quelle part de chaque quartier on a parcourue.

À faire :
- Pour chaque arrondissement et commune : longueur des segments parcourus sur longueur totale des segments retenus au T18.
- Affichage dans le Profil : liste des arrondissements et communes avec leur pourcentage, le plus avancé en premier.

Fini quand : les pourcentages bougent après une marche dans un arrondissement.

## T22 Synchroniser les rues, plus les points

Objectif : ne plus jamais envoyer de positions brutes sur le serveur.

À faire :
- Synchroniser la table `rues_parcourues` et les cartes débloquées, plus la table des points.
- La table `passages` (T19) contient l'heure de chaque passage : elle reste sur le téléphone. On ne synchronise que le jour de chaque passage, jamais l'heure.
- Nouvelle migration Supabase : table des rues parcourues avec sécurité au niveau des lignes, puis suppression des points bruts déjà envoyés et de leur table.
- Mettre à jour `scripts/test-rls.mjs` pour vérifier la nouvelle table.
- Mettre à jour l'écran d'accueil et la politique de confidentialité : seules les rues parcourues et les cartes quittent le téléphone.

Fini quand : le compte Supabase ne contient plus aucune position brute, et une réinstallation retrouve les rues parcourues.

---

# Phase E : interface et jeu

Objectif : une interface complète et belle, testable depuis chez soi avec le menu de simulation de position. Référence du contenu : docs/LIEUX.md.

## T23 Les 100 lieux

- Remplacer les 20 lieux de `src/cartes/lieux.ts` par les 100 de docs/LIEUX.md, en gardant les identifiants existants pour ne pas perdre les lieux déjà débloqués.
- Nouveaux champs : rarete (visible, indice, secret, legendaire), format (portrait, paysage, carre, grand), defis (liste d'identifiants), indice (texte).
- Coordonnées et rayons calculés depuis l'extrait OpenStreetMap déjà en cache (scripts/rues/cache), par un script relançable. Rayon plus grand pour les parcs, bois et quartiers (contour réel si OSM l'a). Lister dans le ticket les lieux non trouvés au lieu d'inventer des coordonnées.
- Les anecdotes restent vides quand on n'en a pas de vérifiée.

Fini quand : les 100 lieux sont dans l'app, avec des positions vérifiées sur une carte par Enzo pour une dizaine pris au hasard.

Fait :
- `node scripts/lieux/generer.mjs` (35 s) écrit `src/cartes/positions.json`. `--chercher=mot` liste ce qu'OSM a sous ce nom, pour enquêter.
- Déblocage dans le contour réel quand OSM l'a : parcs, bois, cimetières et quartiers avec 15 m de marge, emprise des bâtiments avec 40 m (80 m pour l'Arc de Triomphe et le parvis de Notre-Dame). Rue Crémieux, rue du Chat-qui-Pêche, villa Léandre, canal Saint-Martin et Champs-Élysées : le long de la voie. Un cercle pour les lieux qui ne sont qu'un point dans OSM.
- Pas de contour dans OSM : La Défense (cercle de 600 m sur l'esplanade), Quartier latin (quartier administratif de la Sorbonne), Belleville (quartier administratif, côté 20e seulement), Provins (450 m autour de la tour César), Désert de Retz (250 m).
- Station fantôme : Croix-Rouge (6e), choisie par Enzo.

Lieux non trouvés dans OpenStreetMap, sans position, donc pas encore débloquables :
- 088 Ancienne gare d'Ornano : la gare de la Petite Ceinture n'est pas étiquetée.
- 100 Station fantôme (Croix-Rouge) : la station fermée n'est pas étiquetée.

À savoir : selon OSM, le Marché des Enfants-Rouges a été endommagé par un incendie le 12 octobre 2026.

## T24 Les timbres

Les timbres remplacent les cartes carrées.
- Composant `Timbre` : bord dentelé (perforations), marge blanche, image au centre, petit nom, numéro, couleur de la catégorie. Quatre formats : portrait, paysage, carré, grand (pour quartiers et légendaires).
- Pas encore de photos : à la place, un aplat de la couleur de la catégorie avec le nom en grand. Prévoir l'emplacement de la photo et du futur filtre maison (bichromie, trame, encres décalées), sans le coder.
- Oblitération : un tampon rond daté posé en travers du timbre quand il est débloqué.
- Toucher un timbre : il s'agrandit en plein écran, comme sous une loupe. Deuxième toucher : il se retourne et montre le verso (nom, catégorie, zone, anecdote, date de découverte, défis liés).
- Garder le vernis qui suit l'inclinaison si ça reste joli sur un timbre, sinon le retirer.

Fini quand : les quatre formats s'affichent correctement, l'agrandissement et le retournement sont fluides.

Fait :
- `src/timbres/Timbre.tsx` : recto, verso, oblitération et emplacement vide. Proportions : portrait 0,78 × 1, paysage 1 × 0,78, carré 0,86 × 0,86, grand 1,3 × 1.
- Aplat avec le nom en grand pour les 100 lieux, choix d'Enzo : les 20 SVG restent dans le dépôt sans être affichés. L'emplacement de la future photo est le composant `Illustration`.
- Oblitération : zone du lieu en haut, jour et mois au centre, année en bas, trois lignes ondulées. Pour « Nouveau timbre », le tampon tombe après l'agrandissement, avec une vibration.
- `src/timbres/TimbreEnGrand.tsx` : la loupe, utilisée par l'album, le profil, la carte et « Nouveau timbre ». Toucher le fond ferme.
- Reflet gardé, plus discret, sur l'image du timbre en grand seulement.
- Album : grille provisoire, une case par timbre, en attendant le carnet du T25. Profil : « Derniers timbres », les quatre derniers, un peu de travers.
- Retirés : `Carte.tsx`, `CarteEnGrand.tsx`, `NouvelleCarte.tsx`, `illustrations.ts`.
- Dents du papier : une forme percée de cercles (règle evenodd). Un masque SVG faisait planter Expo Go dès qu'un timbre s'ouvrait en grand, dans la vue retournée en 3D.
- Pas fait ici : le timbre spécial des défis, plus tard (choix d'Enzo).

## T25 L'album en carnet de timbres

- L'onglet Album devient un carnet : une page par défi, plus une page « Autres lieux ».
- Chaque page montre les emplacements de ses timbres. Débloqué : le timbre oblitéré. Pas encore : l'emplacement vide en pointillés, avec le numéro.
- En haut : nombre total de timbres sur 100, et filtre par catégorie.
- Une page complète change d'aspect (bordure dorée ou équivalent sobre).

Fini quand : l'album reflète exactement les lieux débloqués et se lit comme un carnet.

## T26 Visibilité

- Visible : marqueur normal sur la carte.
- Indice : sur la carte, une zone floue d'environ 300 m (le centre décalé au hasard, mais toujours le même pour un lieu) avec un point d'interrogation. Toucher la zone affiche la devinette.
- Secret : rien sur la carte. À moins de 200 m, une vibration légère, au plus une fois par lieu et par heure. Un secret révélé par un défi devient un indice.
- Légendaire : visible, timbre grand format. Pour la station fantôme, prévoir une validation manuelle avec photo du billet, à coder plus tard.
- Tout se teste avec le menu de simulation de position.

Fini quand : chaque niveau se comporte comme décrit en simulation.

Fait :
- Règle dans `src/deblocage/visibilite.ts`. Un lieu débloqué garde toujours son marqueur.
- Zone d'indice : 150 m de rayon (plus pour un grand lieu), centre décalé de 26 m à un peu plus de la moitié du rayon, toujours le même pour un lieu. Toucher la zone ou le « ? » montre la devinette, jamais le nom.
- Vibration des secrets comptée depuis le bord du lieu, app ouverte seulement. Le délai d'une heure est gardé en mémoire : il repart à zéro si l'app est relancée.
- Secrets révélés : `secretsReveles()` est vide en attendant les défis (T27).
- Menu de simulation : une ligne « Près de » par secret, à 100 m du bord, pour sentir la vibration sans débloquer.
- Pas fait ici : timbre grand format des légendaires (T24), validation par photo du billet (plus tard).

## T27 Les défis

- Les 13 défis de docs/LIEUX.md, dans un fichier de données.
- Onglet Défis : liste des défis avec icône, titre, avancement « 3 / 7 » et barre. Toucher un défi ouvre sa page d'album.
- Une icône par défi, dessinée simple dans le style de l'app (trait d'encre, une couleur).
- Défi terminé : écran de célébration, timbre spécial, et révélation des secrets liés.
- Les défis basés sur les rues (Monopoly, bestiaire, escargot…) viendront après T19, ne pas les coder ici.

Maquette validée par Enzo : `docs/maquettes/profil-defis.html` (à ouvrir dans un navigateur), écran de droite.
- Titre « Défis » en très gros, puis « X terminés sur 13 ».
- Une ligne par défi, séparée par un trait d'encre : icône carrée (contour encre, fond à la couleur de la catégorie), titre, avancement « 3 / 5 » à droite, une ligne de récompense (« Révèle un lieu secret », « Timbre spécial », « Terminé. 2 lieux secrets révélés »), barre d'avancement contour encre remplie de la couleur.
- Défi terminé : icône et barre en or. Défi pas commencé : fond crème et cadenas.
- Icônes : Tabler en contour (train, pont, arbres, ballon…), via une bibliothèque compatible Expo Go.

Fini quand : terminer Voyage en train en simulation révèle l'ancienne gare d'Ornano et la rue Crémieux.

Fait :
- Données dans `src/defis/defis.ts`. Avancement et fin se déduisent des cartes débloquées : rien de plus à enregistrer ni à synchroniser, un nouveau téléphone retrouve ses défis. Date de fin : celle du dernier lieu.
- Onglet d'après docs/maquettes/profil-defis.html. Icônes Tabler (`@tabler/icons-react-native` 3.50.0), importées une par une pour ne pas embarquer les 6 000.
- Provisoire en attendant T24 et T25 : la célébration montre l'icône du défi en grand, et toucher un défi ouvre une page simple de ses emplacements.
- Un secret révélé devient un indice sur la carte, sans devinette. L'ancienne gare d'Ornano, sans position, n'apparaît pas sur la carte.
- Châteaux : rien à révéler, Versailles, Fontainebleau et Vaux-le-Vicomte sont déjà visibles. La célébration les cite.

## T28 Notifications des défis

- Notifications locales (expo-notifications) : avancée d'un défi (« Voyage en train : 3 / 7. Gare de l'Est ajoutée. ») et défi terminé.
- Plusieurs avancées en peu de temps regroupées en une seule notification.
- Réglages : couper séparément nouveaux lieux, avancées de défis, défis terminés.
- App fermée : dépend de T09, ne pas bloquer dessus.

Fini quand : en simulation, l'app ouverte en arrière-plan, la notification arrive.

## T29 Profil : username, bio, photo

- Pas de nom ni de prénom. Username unique sans tenir compte des majuscules, 3 à 20 caractères (lettres, chiffres, point, tiret bas), mots réservés interdits (admin, balade, support…), modifiable une fois tous les 30 jours. Contrainte d'unicité en base, vérifiée côté serveur.
- Bio de 150 caractères maximum.
- Photo de profil stockée sur Cloudflare R2. Aucune clé R2 dans l'app : une fonction Supabase vérifie la session et renvoie un lien d'envoi signé et temporaire. Image redimensionnée en 512 px, JPEG ou WebP, 2 Mo maximum, nom de fichier aléatoire.
- Supprimer toutes les métadonnées de la photo avant l'envoi, en particulier la position GPS, et le revérifier côté serveur.
- Sécurité au niveau des lignes : chacun ne modifie que son profil.

Maquette validée par Enzo : `docs/maquettes/profil-defis.html`, écran de gauche.
- Titre « Profil » et icône réglages en haut à droite.
- Photo ronde 76 px, contour encre, initiale sur fond ocre si pas de photo, petit bouton appareil photo en bas à droite.
- @username en gros, bio en dessous.
- Quatre chiffres en grille 2 × 2 dans des encadrés crème clair : Timbres « 23 / 100 », Défis « 2 / 13 », Kilomètres, Rues.
- « Derniers timbres » : les quatre derniers, petits, perforés, légèrement de travers, à leur format réel.
- « Tes quartiers » : les trois communes ou arrondissements les plus parcourus, avec pourcentage et barre ocre (dépend du T21, afficher la section seulement quand il est fait).
- Un seul bouton plein encre : « Modifier le profil ».

Fini quand : Enzo change sa photo, sa bio et son username, et deux comptes de test ne peuvent pas modifier le profil l'un de l'autre.

Fait :
- Migration `supabase/migrations/0002_profils.sql` : règles vérifiées par le serveur (format, unicité sans majuscules, mots réservés et tout nom contenant « balade » ou « admin », 30 jours, bio). Le premier choix ne déclenche pas les 30 jours. L'app ne peut écrire que username et bio : photo_cle n'est écrit que par la fonction.
- Username obligatoire après la connexion (choix d'Enzo). Retenu sur le téléphone, et sans réseau l'app laisse entrer.
- Photo : bucket R2 privé, liens signés par `supabase/functions/photo-profil` (envoi 5 minutes, lecture une heure). Recadrée en 512 px, réencodée en JPEG, métadonnées retirées par l'app puis revérifiées par la fonction, qui supprime tout fichier non conforme. Nom aléatoire, sans lien avec le compte.
- Mise en place à faire par Enzo : docs/SUPABASE.md, étapes 6 à 8.
- Profil d'après docs/maquettes/profil-defis.html : avatar, @username, bio, « Modifier le profil », chiffre Défis. Pas encore « Rues » ni « Tes quartiers » (T21), ni « Derniers timbres » (T24).

## T30 Les trois vues de l'accueil

À faire après T20 (carte maison).
- Sélecteur en haut de la carte : Rues, Transports, Lieux.
- Rues : la vue normale, rues parcourues en couleur.
- Transports : lignes de métro, RER et tram en couleur depuis les données OpenStreetMap, stations visitées marquées.
- Lieux : le fond s'efface, il ne reste que les lieux selon leur visibilité.

Fini quand : passer d'une vue à l'autre est instantané.

## T31 Bug de position dehors

Dehors, l'app reste sur « recherche en cours » sans obtenir de position. Trouver pourquoi (délai trop court, précision trop exigeante, effet du T19, permission), corriger, et ajouter un message clair si le GPS ne répond pas.

Fini quand : dehors, la position arrive en moins de 15 secondes.

Fait :
- Cause probable : si iOS n'avait pas de dernière position, l'écran attendait `getCurrentPositionAsync` sans limite de temps, et cet appel peut ne jamais répondre sur iPhone.
- `src/suivi/premierePosition.ts` : dernière position de moins de 10 minutes, sinon le flux continu et une demande ponctuelle en même temps, la première qui répond gagne. Limite de 15 secondes.
- Au-delà : si la localisation est coupée, l'écran le dit. Sinon la carte s'affiche sur Paris avec un message, et se centre dès que la position arrive.
- « Position exacte » coupée dans iOS : message dédié, car les points à 1 km près sont jetés.

## T32 Paramètres

Écran ouvert par l'icône réglages du profil. Sections, dans cet ordre. Avant de coder, lire docs/DONNEES.md.

Compte
- Modifier le profil (photo, username, bio), adresse e-mail (changement avec code de vérification).
- Appareils connectés et « Se déconnecter partout » (révocation des sessions Supabase).
- Se déconnecter.
- Supprimer mon compte : confirmation en deux temps, suppression réelle côté serveur (fonction Supabase) de toutes les tables, de la photo R2 et du compte de connexion, puis effacement de la base du téléphone. Obligatoire pour l'App Store et le RGPD.

Confidentialité
- Qui peut voir mon profil : amis (par défaut) ou tout le monde.
- Qui peut m'envoyer une demande d'ami : tout le monde (par défaut) ou seulement par lien ou QR code.
- Apparaître dans la recherche par username : oui par défaut.
- Ce que mes amis voient, un interrupteur chacun : timbres, défis, quartiers, kilomètres et pas. Tout activé par défaut.
- Zones privées : jusqu'à 3 cercles (domicile, travail…) de 150 m par défaut, réglables. Aucune position n'y est enregistrée, ni recalée. Restent uniquement sur le téléphone, jamais synchronisées.
- Mode pause du suivi : 1 heure, 1 journée, jusqu'à nouvel ordre. Indicateur visible sur la carte tant qu'il est actif.
- Télécharger mes données (fichier JSON de tout ce qui concerne le compte) et effacer mon historique de déplacements.

Suivi et batterie
- Suivi en arrière-plan, mode économie, synchroniser seulement en Wi-Fi.

Notifications
- Un interrupteur par type : nouveau lieu, avancée de défi, défi terminé, lieu caché à proximité, demandes d'amis. Reprend les réglages du T28.

Affichage
- Vibrations, reflet des timbres, réduire les animations (activé automatiquement si le réglage d'accessibilité du téléphone l'est).

Aide et mentions
- Politique de confidentialité, conditions d'utilisation, mentions légales : écrans de texte, contenu provisoire marqué « à rédiger ».
- Crédits, avec « © contributeurs OpenStreetMap » et la licence ODbL.
- Signaler un bug (ouvre un e-mail prérempli), version de l'app.

Règles :
- Les réglages de confidentialité sont stockés sur le serveur (ils décident de ce que les autres peuvent lire) et appliqués par la base, pas seulement par l'app.
- Les réglages d'affichage et les zones privées restent sur le téléphone.
- Style : même DA que le profil, une liste par section avec titres en capitales espacées, traits d'encre entre les lignes.

Fini quand : chaque réglage a un effet vérifiable, et la suppression de compte efface vraiment tout (vérifié dans Supabase et R2).

## T33 Amis

Avant de coder, lire docs/DONNEES.md. Dépend du T32 pour les réglages de confidentialité.

Sur le profil, la section « Compte » est remplacée par « Amis » :
- Demandes reçues en haut, avec Accepter et Refuser.
- Liste des amis : photo, @username, nombre de timbres. Toucher ouvre le profil de l'ami.
- Bouton « Ajouter ».

Ajouter un ami, trois façons :
- Par username exact (pas de recherche partielle, pour qu'on ne puisse pas parcourir la liste des inscrits). Respecte « Apparaître dans la recherche ».
- Par QR code : chacun a le sien dans l'app, l'autre le scanne avec la caméra de l'app.
- Par lien d'invitation, partageable par message. Jeton aléatoire, valable 7 jours, révocable.

Règles :
- Une demande doit être acceptée. Relation dans les deux sens.
- Retirer un ami, bloquer (l'autre ne peut plus nous trouver ni nous écrire), signaler (enregistré pour modération, pas d'action automatique).
- Maximum 20 demandes envoyées par jour, vérifié par la base.
- Profil d'un ami : ses timbres, ses défis, ses quartiers, ses kilomètres et pas, et une comparaison avec soi, uniquement ce qu'il a choisi de montrer. Jamais de position, de tracé ni de passages.
- Toutes ces règles sont appliquées par la sécurité au niveau des lignes et des fonctions de la base, jamais seulement par l'app.
- Étendre `scripts/test-rls.mjs` : un inconnu ne lit rien, un ami ne lit que ce qui est autorisé, un compte bloqué ne voit rien, personne ne lit les positions d'un autre.

Fini quand : Enzo ajoute un compte de test par les trois façons, voit son profil selon ses réglages, et les tests de sécurité passent tous.

