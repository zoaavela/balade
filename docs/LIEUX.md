# Les 100 premiers lieux

Liste de travail validée par Enzo le 16 novembre 2026. Les coordonnées et les rayons seront calculés depuis OpenStreetMap au moment de les intégrer. Les anecdotes du verso viendront ensuite. Les indices sont à revérifier avant publication.

## Règles

- **Visible** : affiché sur la carte dès le départ. Les lieux connus, pour que le joueur ait vite ses premiers timbres.
- **Indice** : sur la carte, une zone floue d'environ 300 m avec un point d'interrogation et une devinette. Il faut chercher sur place.
- **Secret** : invisible. Découvert par hasard, ou révélé par un défi terminé. À moins de 200 m, le téléphone vibre légèrement sans dire où.
- **Légendaire** : grande couronne ou accès rare. Toujours visible, mais loin ou difficile. Validation par preuve (billet de visite) si la position ne suffit pas.

Formats de timbre : portrait pour les monuments en hauteur, paysage pour les ponts, places, parcs et gares, carré pour les petits lieux, grand pour les quartiers et les légendaires.

Catégories et bordures inchangées : culture (brique), lieux de vie (cobalt), mystères et nature (vert bouteille), quartier (ocre), légendaire (or).

## Répartition

| Rareté | Nombre |
| --- | --- |
| visible | 48 |
| indice | 34 |
| secret | 11 |
| légendaire | 7 |

## Défis

Un défi est une page d'album. Page complète : un timbre spécial, et parfois des lieux secrets révélés.

| id | Défi | Contenu | Lieux | Révèle |
| --- | --- | --- | --- | --- |
| train | Voyage en train | Les sept grandes gares parisiennes. | Gare du Nord, Gare de l'Est, Gare de Lyon, Gare d'Austerlitz, Gare de Bercy, Gare Montparnasse, Gare Saint-Lazare | ancienne-gare-d-ornano, rue-cremieux |
| ponts | Les ponts de Paris | Cinq ponts et passerelles. | Pont Neuf, Pont Alexandre III, Pont des Arts, Pont de Bir-Hakeim, Passerelle Simone-de-Beauvoir | ile-aux-cygnes, square-du-vert-galant |
| passages | Passages couverts | Les trois grands passages des Grands Boulevards. | Passage des Panoramas, Galerie Vivienne, Passage Jouffroy | timbre spécial |
| pouvoir | Sortie politique | Les lieux du pouvoir. | Hôtel de Ville, Jardin du Luxembourg, Palais-Royal, Assemblée nationale, Palais de l'Élysée | metre-etalon |
| revolution | Révolution | Les lieux de 1789 et après. | Panthéon, Place de la Concorde, Conciergerie, Place de la Bastille | timbre spécial |
| rive-gauche | Rive gauche | Écrivains, cafés et Quartier latin. | Quartier latin, Saint-Germain-des-Prés, Sorbonne, Shakespeare and Company, Café de Flore, Les Deux Magots | rue-du-chat-qui-peche |
| paris-ancien | Paris romain et médiéval | Les plus vieilles pierres de la ville. | Notre-Dame, Sainte-Chapelle, Musée de Cluny, Tour Saint-Jacques | arenes-de-lutece |
| montmartre | Montmartre | La butte de haut en bas. | Sacré-Cœur, Montmartre, Moulin Rouge, Place du Tertre, Café des Deux Moulins, Cimetière de Montmartre | villa-leandre, mur-des-je-t-aime |
| parcs | Les grands parcs | Cinq parcs et jardins de Paris. | Jardin du Luxembourg, Jardin des Tuileries, Buttes-Chaumont, Parc de la Villette, Parc Monceau | butte-bergeyre |
| cimetieres | Cimetières célèbres | Les trois grands cimetières. | Cimetière du Père-Lachaise, Cimetière du Montparnasse, Cimetière de Montmartre | timbre spécial |
| stades | Les stades | Foot, tennis, rugby et concerts. | Parc des Princes, Stade Roland-Garros, Stade de France, Accor Arena | timbre spécial |
| westfield | Westfield | Les centres Westfield de la petite couronne. | Westfield Forum des Halles, Westfield Les 4 Temps, Westfield Rosny 2 | timbre spécial |
| chateaux | Les châteaux | Trois châteaux proches de Paris. | Château de Vincennes, Parc de Sceaux, Château de Malmaison | indices vers Versailles, Fontainebleau et Vaux-le-Vicomte |

Le point zéro des routes de France n'est révélé par aucun défi : on le trouve en passant devant Notre-Dame.

## Défis : affichage et notifications (décidé le 16 novembre 2026)

- Chaque défi affiche son avancement en nombre : « 1 / 20 », plus une barre ou une page d'album qui se remplit.
- Chaque défi a sa propre icône, dessinée pour lui (un train pour Voyage en train, un pont pour les ponts…), dans le style de l'app.
- Notification locale quand un lieu fait avancer un défi : « Voyage en train : 3 / 7. Gare de l'Est ajoutée. »
- Notification plus forte quand un défi est terminé : « Défi terminé : Voyage en train. Un lieu secret vient d'apparaître. »
- Garde-fous : plusieurs avancées en peu de temps sont regroupées en une seule notification, et chaque type de notification peut être coupé dans les réglages.
- App fermée, ces notifications dépendent du suivi en arrière-plan (T09), donc de la build de développement.

## Les lieux

| N° | id | Nom | Catégorie | Zone | Rareté | Format | Défis | Indice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | tour-eiffel | Tour Eiffel | culture | Paris 7e | visible | portrait |  |  |
| 002 | arc-de-triomphe | Arc de Triomphe | culture | Paris 8e | visible | portrait |  |  |
| 003 | louvre | Louvre | culture | Paris 1er | visible | paysage |  |  |
| 004 | notre-dame | Notre-Dame | culture | Paris 4e | visible | portrait | paris-ancien |  |
| 005 | sacre-coeur | Sacré-Cœur | culture | Paris 18e | visible | portrait | montmartre |  |
| 006 | pantheon | Panthéon | culture | Paris 5e | visible | portrait | revolution |  |
| 007 | chateau-de-vincennes | Château de Vincennes | culture | Vincennes | visible | portrait | chateaux |  |
| 008 | invalides | Invalides | culture | Paris 7e | visible | portrait |  |  |
| 009 | sainte-chapelle | Sainte-Chapelle | culture | Paris 1er | visible | portrait | paris-ancien |  |
| 010 | opera-garnier | Opéra Garnier | culture | Paris 9e | visible | paysage |  |  |
| 011 | centre-pompidou | Centre Pompidou | culture | Paris 4e | visible | paysage |  |  |
| 012 | grand-palais | Grand Palais | culture | Paris 8e | visible | paysage |  |  |
| 013 | musee-d-orsay | Musée d'Orsay | culture | Paris 7e | visible | paysage |  |  |
| 014 | place-de-la-concorde | Place de la Concorde | culture | Paris 8e | visible | paysage | revolution |  |
| 015 | hotel-de-ville | Hôtel de Ville | culture | Paris 4e | visible | paysage | pouvoir |  |
| 016 | trocadero | Trocadéro | culture | Paris 16e | visible | paysage |  |  |
| 017 | place-des-vosges | Place des Vosges | culture | Paris 4e | visible | paysage |  |  |
| 018 | basilique-saint-denis | Basilique de Saint-Denis | culture | Saint-Denis | visible | portrait |  |  |
| 019 | pont-neuf | Pont Neuf | culture | Paris 1er | visible | paysage | ponts |  |
| 020 | pont-alexandre-iii | Pont Alexandre III | culture | Paris 8e | visible | paysage | ponts |  |
| 021 | pere-lachaise | Cimetière du Père-Lachaise | mystères et nature | Paris 20e | visible | paysage | cimetieres |  |
| 022 | gare-du-nord | Gare du Nord | lieux de vie | Paris 10e | visible | paysage | train |  |
| 023 | gare-de-l-est | Gare de l'Est | lieux de vie | Paris 10e | visible | paysage | train |  |
| 024 | gare-de-lyon | Gare de Lyon | lieux de vie | Paris 12e | visible | portrait | train |  |
| 025 | gare-d-austerlitz | Gare d'Austerlitz | lieux de vie | Paris 13e | visible | paysage | train |  |
| 026 | gare-de-bercy | Gare de Bercy | lieux de vie | Paris 12e | visible | paysage | train |  |
| 027 | gare-montparnasse | Gare Montparnasse | lieux de vie | Paris 15e | visible | paysage | train |  |
| 028 | gare-saint-lazare | Gare Saint-Lazare | lieux de vie | Paris 8e | visible | paysage | train |  |
| 029 | parc-des-princes | Parc des Princes | lieux de vie | Paris 16e | visible | paysage | stades |  |
| 030 | roland-garros | Stade Roland-Garros | lieux de vie | Paris 16e | visible | paysage | stades |  |
| 031 | stade-de-france | Stade de France | lieux de vie | Saint-Denis | visible | paysage | stades |  |
| 032 | accor-arena | Accor Arena | lieux de vie | Paris 12e | visible | paysage | stades |  |
| 033 | forum-des-halles | Westfield Forum des Halles | lieux de vie | Paris 1er | visible | paysage | westfield |  |
| 034 | les-4-temps | Westfield Les 4 Temps | lieux de vie | Puteaux | visible | paysage | westfield |  |
| 035 | jardin-du-luxembourg | Jardin du Luxembourg | mystères et nature | Paris 6e | visible | paysage | parcs, pouvoir |  |
| 036 | jardin-des-tuileries | Jardin des Tuileries | mystères et nature | Paris 1er | visible | paysage | parcs |  |
| 037 | buttes-chaumont | Buttes-Chaumont | mystères et nature | Paris 19e | visible | paysage | parcs |  |
| 038 | parc-de-la-villette | Parc de la Villette | mystères et nature | Paris 19e | visible | paysage | parcs |  |
| 039 | bois-de-boulogne | Bois de Boulogne | mystères et nature | Paris 16e | visible | grand |  |  |
| 040 | bois-de-vincennes | Bois de Vincennes | mystères et nature | Paris 12e | visible | grand |  |  |
| 041 | canal-saint-martin | Canal Saint-Martin | mystères et nature | Paris 10e | visible | paysage |  |  |
| 042 | la-defense | La Défense | quartier | Puteaux, Courbevoie | visible | grand |  |  |
| 043 | le-marais | Le Marais | quartier | Paris 3e et 4e | visible | grand |  |  |
| 044 | montmartre | Montmartre | quartier | Paris 18e | visible | grand | montmartre |  |
| 045 | belleville | Belleville | quartier | Paris 19e et 20e | visible | grand |  |  |
| 046 | quartier-latin | Quartier latin | quartier | Paris 5e | visible | grand | rive-gauche |  |
| 047 | saint-germain-des-pres | Saint-Germain-des-Prés | quartier | Paris 6e | visible | grand | rive-gauche |  |
| 048 | champs-elysees | Champs-Élysées | quartier | Paris 8e | visible | grand |  |  |
| 049 | jardin-des-plantes | Jardin des Plantes | mystères et nature | Paris 5e | indice | paysage |  | Un ancien jardin royal de plantes médicinales, devenu muséum. |
| 050 | grande-mosquee | Grande Mosquée de Paris | culture | Paris 5e | indice | portrait |  | Un patio de mosaïques et un thé à la menthe, au bord du Jardin des Plantes. |
| 051 | musee-de-cluny | Musée de Cluny | culture | Paris 5e | indice | paysage | paris-ancien | Des thermes romains et la Dame à la licorne. |
| 052 | tour-saint-jacques | Tour Saint-Jacques | culture | Paris 4e | indice | portrait | paris-ancien | Une tour gothique seule dans un square, ancien départ vers Compostelle. |
| 053 | conciergerie | Conciergerie | culture | Paris 1er | indice | paysage | revolution | Une prison où Marie-Antoinette attendit son procès. |
| 054 | place-de-la-bastille | Place de la Bastille | culture | Paris 11e | indice | portrait | revolution | Une colonne dorée là où se dressait une prison prise d'assaut. |
| 055 | palais-royal | Palais-Royal | culture | Paris 1er | indice | paysage | pouvoir | Un jardin à arcades où siègent le Conseil d'État et le Conseil constitutionnel. |
| 056 | assemblee-nationale | Assemblée nationale | culture | Paris 7e | indice | paysage | pouvoir | Face à la Concorde, de l'autre côté de la Seine, on y vote les lois. |
| 057 | palais-de-l-elysee | Palais de l'Élysée | culture | Paris 8e | indice | paysage | pouvoir | Rue du Faubourg-Saint-Honoré, une grille gardée jour et nuit. |
| 058 | sorbonne | Sorbonne | culture | Paris 5e | indice | portrait | rive-gauche | Une université née au Moyen Âge, au cœur du Quartier latin. |
| 059 | shakespeare-and-company | Shakespeare and Company | lieux de vie | Paris 5e | indice | portrait | rive-gauche | Une librairie anglaise face à Notre-Dame, où des écrivains dormaient entre les rayons. |
| 060 | cafe-de-flore | Café de Flore | lieux de vie | Paris 6e | indice | carré | rive-gauche | Sartre et Beauvoir y écrivaient au chaud, boulevard Saint-Germain. |
| 061 | les-deux-magots | Les Deux Magots | lieux de vie | Paris 6e | indice | carré | rive-gauche | Deux statues chinoises veillent sur cette terrasse face à une église. |
| 062 | passage-des-panoramas | Passage des Panoramas | culture | Paris 2e | indice | portrait | passages | Le plus ancien passage couvert de Paris. |
| 063 | galerie-vivienne | Galerie Vivienne | culture | Paris 2e | indice | portrait | passages | Une galerie aux sols de mosaïque, derrière le Palais-Royal. |
| 064 | passage-jouffroy | Passage Jouffroy | culture | Paris 9e | indice | portrait | passages | Un passage couvert qui mène au musée Grévin. |
| 065 | marche-des-enfants-rouges | Marché des Enfants-Rouges | lieux de vie | Paris 3e | indice | carré |  | Le plus vieux marché couvert de Paris, ouvert sous Louis XIII. |
| 066 | pont-des-arts | Pont des Arts | culture | Paris 6e | indice | paysage | ponts | Une passerelle piétonne entre l'Institut de France et le Louvre. |
| 067 | pont-de-bir-hakeim | Pont de Bir-Hakeim | culture | Paris 15e | indice | paysage | ponts | Un pont à deux étages, le métro passe au-dessus. |
| 068 | passerelle-simone-de-beauvoir | Passerelle Simone-de-Beauvoir | culture | Paris 12e et 13e | indice | paysage | ponts | Une passerelle en vague devant la Bibliothèque nationale. |
| 069 | grand-rex | Le Grand Rex | lieux de vie | Paris 2e | indice | portrait |  | Un cinéma géant au plafond étoilé, sur les Grands Boulevards. |
| 070 | moulin-rouge | Moulin Rouge | lieux de vie | Paris 18e | indice | portrait | montmartre | Des ailes rouges au pied de la butte. |
| 071 | place-du-tertre | Place du Tertre | lieux de vie | Paris 18e | indice | carré | montmartre | Une place où les peintres font ton portrait. |
| 072 | cafe-des-deux-moulins | Café des Deux Moulins | lieux de vie | Paris 18e | indice | carré | montmartre | Le café où travaillait Amélie Poulain. |
| 073 | parc-monceau | Parc Monceau | mystères et nature | Paris 8e | indice | paysage | parcs | Une fausse ruine romaine au milieu d'un parc chic. |
| 074 | cimetiere-du-montparnasse | Cimetière du Montparnasse | mystères et nature | Paris 14e | indice | paysage | cimetieres | Sartre et Beauvoir y reposent ensemble. |
| 075 | cimetiere-de-montmartre | Cimetière de Montmartre | mystères et nature | Paris 18e | indice | paysage | cimetieres, montmartre | Un cimetière qu'un pont routier enjambe. |
| 076 | catacombes | Catacombes | culture | Paris 14e | indice | paysage |  | Des millions d'ossements sous la place Denfert-Rochereau. |
| 077 | puces-de-saint-ouen | Puces de Saint-Ouen | lieux de vie | Saint-Ouen | indice | paysage |  | Un immense marché aux puces, juste après la porte de Clignancourt. |
| 078 | parc-de-sceaux | Parc de Sceaux | mystères et nature | Sceaux | indice | paysage | chateaux | Un jardin à la française dessiné par Le Nôtre, au sud de Paris. |
| 079 | domaine-de-saint-cloud | Domaine de Saint-Cloud | mystères et nature | Saint-Cloud | indice | paysage |  | Un château disparu et une vue sur tout Paris. |
| 080 | chateau-de-malmaison | Château de Malmaison | culture | Rueil-Malmaison | indice | paysage | chateaux | La maison de Joséphine, l'épouse de Napoléon. |
| 081 | parc-de-la-poudrerie | Parc de la Poudrerie | mystères et nature | Sevran | indice | paysage |  | Une ancienne poudrerie devenue forêt, au bord du canal de l'Ourcq. |
| 082 | westfield-rosny-2 | Westfield Rosny 2 | lieux de vie | Rosny-sous-Bois | indice | paysage | westfield | Le Westfield de l'est parisien. |
| 083 | metre-etalon | Mètre étalon | mystères et nature | Paris 6e | secret | carré | pouvoir |  |
| 084 | point-zero | Point zéro des routes de France | mystères et nature | Paris 4e | secret | carré |  |  |
| 085 | rue-du-chat-qui-peche | Rue du Chat-qui-Pêche | mystères et nature | Paris 5e | secret | portrait | rive-gauche |  |
| 086 | arenes-de-lutece | Arènes de Lutèce | mystères et nature | Paris 5e | secret | paysage | paris-ancien |  |
| 087 | ile-aux-cygnes | Île aux Cygnes et sa statue de la Liberté | mystères et nature | Paris 15e | secret | portrait | ponts |  |
| 088 | ancienne-gare-d-ornano | Ancienne gare d'Ornano | mystères et nature | Paris 18e | secret | paysage | train |  |
| 089 | rue-cremieux | Rue Crémieux | mystères et nature | Paris 12e | secret | portrait | train |  |
| 090 | butte-bergeyre | Butte Bergeyre | mystères et nature | Paris 19e | secret | carré | parcs |  |
| 091 | villa-leandre | Villa Léandre | mystères et nature | Paris 18e | secret | paysage | montmartre |  |
| 092 | mur-des-je-t-aime | Mur des je t'aime | mystères et nature | Paris 18e | secret | paysage | montmartre |  |
| 093 | square-du-vert-galant | Square du Vert-Galant | mystères et nature | Paris 1er | secret | paysage | ponts |  |
| 094 | chateau-de-versailles | Château de Versailles | légendaire | Versailles | légendaire | grand | chateaux |  |
| 095 | chateau-de-fontainebleau | Château de Fontainebleau | légendaire | Fontainebleau | légendaire | grand | chateaux |  |
| 096 | vaux-le-vicomte | Vaux-le-Vicomte | légendaire | Maincy | légendaire | grand | chateaux |  |
| 097 | provins | Cité médiévale de Provins | légendaire | Provins | légendaire | grand |  |  |
| 098 | desert-de-retz | Désert de Retz | légendaire | Chambourcy | légendaire | grand |  |  |
| 099 | auvers-sur-oise | Auvers-sur-Oise | légendaire | Auvers-sur-Oise | légendaire | grand |  |  |
| 100 | station-fantome | Station fantôme | légendaire | Paris 6e (Croix-Rouge, choisie le 16 novembre 2026) | légendaire | grand |  |  |
