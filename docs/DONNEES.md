# Les données de Balade

Ce fichier décrit toutes les données de l'app, où elles vivent et ce qui circule. Il fait référence : toute nouvelle table passe d'abord par ici.

## Le principe

- **Le compte** est le pivot. Supabase crée un identifiant unique (`user_id`) à l'inscription, par e-mail et code. Toutes les tables du serveur pointent vers lui.
- **Le téléphone** garde une base SQLite par compte. L'app fonctionne avec elle, même sans réseau.
- **Le serveur** (Supabase) garde une copie de ce qui doit survivre à un changement de téléphone, et ce que les amis peuvent voir.
- **Les positions brutes ne quittent jamais le téléphone** une fois le T22 fait. Le serveur ne connaît que des rues parcourues, des lieux débloqués et des chiffres.

## Vue d'ensemble

| Donnée | Téléphone | Serveur | Visible par un ami |
| --- | --- | --- | --- |
| Positions brutes | oui, 7 jours après recalage | non (à supprimer au T22) | jamais |
| Rues parcourues | oui | oui (T22) | non, seulement le pourcentage par quartier |
| Passages (rue, jour, heure) | oui | jour seulement, jamais l'heure | non |
| Distance par jour | oui | oui | total, si autorisé |
| Pas par jour | oui | oui | total, si autorisé |
| Lieux débloqués | oui | oui | si autorisé |
| Défis | calculés à partir des lieux | calculés | si autorisé |
| Profil (username, bio, photo) | copie | oui | oui |
| Réglages de confidentialité | copie | oui | non |
| Zones privées | oui | jamais | jamais |
| Réglages d'affichage | oui | non | non |
| Amitiés, demandes, blocages | copie | oui | seulement les concernés |
| Réseau de rues, 100 lieux, défis | embarqués dans l'app, lecture seule | non | sans objet |

## Serveur : tables Supabase

Toutes ont la sécurité au niveau des lignes activée.

| Table | Colonnes principales | Qui lit | Qui écrit | État |
| --- | --- | --- | --- | --- |
| auth.users | e-mail, connexion | Supabase seulement | Supabase | existe |
| profils | user_id, username, bio, photo_cle, username_modifie_le, cree_le | soi ; les autres selon « qui peut voir mon profil » | soi (username, bio), fonction photo-profil (photo_cle) | existe (0002) |
| cartes_debloquees | user_id, lieu_id, debloquee_le | soi ; amis si autorisé | soi | existe (0001) |
| points | positions brutes | soi | soi | existe (0001), à supprimer au T22 |
| rues_parcourues | user_id, segment_id, premiere_fois, derniere_fois, nb_passages | soi | soi | T22 |
| passages_jours | user_id, segment_id, jour | soi | soi | T22 |
| stats_jours | user_id, jour, metres, pas | soi ; totaux pour les amis si autorisé | soi | T22 |
| confidentialite | user_id, profil_public, demandes_ouvertes, dans_recherche, montrer_timbres, montrer_defis, montrer_quartiers, montrer_stats | soi | soi | T32 |
| amities | demandeur, destinataire, statut (en_attente, acceptee), cree_le, repondu_le | les deux concernés | demandeur (créer), destinataire (accepter, refuser), les deux (supprimer) | T33 |
| blocages | bloqueur, bloque, cree_le | bloqueur | bloqueur | T33 |
| invitations | user_id, jeton, expire_le, revoquee | soi | soi | T33 |
| signalements | auteur, cible, motif, cree_le | personne côté app | auteur | T33 |

Les données d'un ami ne sont jamais lues table par table depuis l'app : une fonction de la base (`profil_ami`) renvoie seulement ce que ses réglages autorisent, après avoir vérifié l'amitié et l'absence de blocage.

## Téléphone : base SQLite par compte

| Table | Rôle |
| --- | --- |
| points | positions brutes, recalées puis supprimées après 7 jours |
| rues_parcourues | bouts de rue parcourus |
| passages | chaque passage, avec l'heure, pour redessiner une journée |
| distances_jour | kilomètres figés par jour |
| pas_jours | pas par jour |
| cartes_debloquees | lieux débloqués |
| etat | repères techniques (synchro) |
| zones_privees | à créer au T32, jamais synchronisée |

Plus une base commune au téléphone, `reglages`, pour l'affichage.

## Fichiers

- Cloudflare R2, bucket privé `balade-photos`, Union européenne : photos de profil uniquement, noms aléatoires, liens signés et temporaires, métadonnées supprimées.
- Dans l'app : `assets/data/` (rues, fond de carte), `src/cartes/lieux.ts` (les 100 lieux), les défis.

## Ce qui reste à faire, dans l'ordre

1. T22 : rues, passages par jour et stats vers le serveur ; supprimer la table points du serveur.
2. T32 : table confidentialite, zones privées sur le téléphone, suppression de compte.
3. T33 : amitiés, blocages, invitations, signalements, fonction profil_ami, tests de sécurité.
