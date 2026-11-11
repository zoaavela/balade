# Build de développement iOS

La build de développement est notre propre version d'Expo Go : une vraie app installée sur l'iPhone, qui va chercher le code sur le PC pendant qu'on développe. Elle permet d'utiliser des modules qu'Expo Go ne contient pas, comme le suivi en arrière-plan.

Sans Mac, la chaîne est la suivante :

1. GitHub compile l'app sur un de ses Mac et produit un fichier `.ipa` non signé.
2. SideStore, installé sur l'iPhone, signe ce fichier avec ton identifiant Apple gratuit et l'installe.
3. L'app se connecte au PC (`npx expo start`) par le Wi-Fi, comme Expo Go.

On ne recompile que quand la partie native change : un nouveau module natif installé, ou un réglage modifié dans `app.json`. Pour une modification du code TypeScript, rien à faire, le PC envoie le nouveau code tout seul.

## 1. Compiler sur GitHub

1. Ouvrir https://github.com/zoaavela/balade et aller dans l'onglet **Actions**.
2. Dans la colonne de gauche, choisir **Build iOS de développement**.
3. Cliquer sur **Run workflow** (à droite), garder la branche `main`, puis cliquer sur le bouton vert **Run workflow**.
4. Attendre environ 20 à 30 minutes. Une coche verte apparaît quand c'est fini, une croix rouge en cas d'échec.
5. Cliquer sur l'exécution terminée. En bas de la page, dans **Artifacts**, télécharger **balade-dev-ipa**. GitHub le donne sous forme de `.zip`, qui contient `balade-dev.ipa`.

En cas de croix rouge : le journal **journal-compilation** est disponible au même endroit. Me donner le lien de l'exécution.

Le fichier reste téléchargeable 14 jours.

## 2. Installer SideStore (une seule fois)

Documentation officielle, à suivre en cas de doute : https://docs.sidestore.io

Il faut : l'iPhone avec un code de déverrouillage, le PC Windows 64 bits, un câble USB, un identifiant Apple et le Wi-Fi.

1. Sur l'iPhone, installer **LocalDevVPN** depuis l'App Store, l'ouvrir et se connecter. Accepter la configuration VPN. Ce VPN doit être allumé chaque fois que SideStore installe ou renouvelle une app.
2. Sur le PC, installer **iTunes** depuis le site d'Apple (https://www.apple.com/itunes/download/win64), de préférence à la version du Microsoft Store.
3. Sur le PC, installer **iloader** : https://github.com/nab138/iloader/releases/latest/download/iloader-windows-x64.msi
4. Brancher l'iPhone en USB, toucher **Faire confiance** et entrer le code.
5. Ouvrir iloader, se connecter avec l'identifiant Apple (attention aux majuscules), choisir l'iPhone, puis **Install SideStore (Stable)**.
6. Sur l'iPhone, activer le **mode développeur** : Réglages, Confidentialité et sécurité, tout en bas, Mode développeur. L'iPhone redémarre, puis confirmer l'activation.
7. Ouvrir SideStore et se connecter avec le même identifiant Apple.

## 3. Installer l'app

1. Télécharger le `.zip` de l'étape 1 sur l'iPhone (Safari, connecté à GitHub), ou le copier depuis le PC.
2. Dans l'app Fichiers, toucher le `.zip` pour le décompresser : `balade-dev.ipa` apparaît.
3. Allumer LocalDevVPN.
4. Ouvrir SideStore, onglet **My Apps**, toucher **+** en haut à gauche, puis choisir `balade-dev.ipa`.
5. L'app apparaît sur l'écran d'accueil.

Pour une nouvelle version, refaire la même chose : elle remplace l'ancienne et garde les données (tracé, cartes).

## 4. Lancer l'app avec le PC

1. Sur le PC, dans le dossier du projet : `npx expo start`. Le PC et l'iPhone doivent être sur le même Wi-Fi.
2. Sur l'iPhone, ouvrir l'app. Elle demande l'accès au **réseau local** : accepter, sinon elle ne trouve pas le PC.
3. L'app liste le serveur du PC : le toucher. On peut aussi scanner le QR code du terminal avec l'appareil photo.

Pour revenir à Expo Go : lancer `npx expo start`, puis appuyer sur `s` dans le terminal pour basculer vers Expo Go.

## 5. Renouveler chaque semaine

Avec un identifiant Apple gratuit, les apps installées par SideStore expirent au bout de 7 jours. Avant la fin :

1. Allumer LocalDevVPN.
2. Ouvrir SideStore, onglet **My Apps**.
3. Toucher le compteur de jours à droite de SideStore, puis celui de l'app.

Si SideStore propose de révoquer ou de recréer un certificat, accepter.

Une app expirée ne s'ouvre plus, mais ses données ne sont pas perdues : il suffit de la renouveler.

## Limites d'un identifiant Apple gratuit

- 3 apps installées par SideStore en même temps au maximum, SideStore compris.
- 10 identifiants d'app nouveaux par semaine : éviter de changer `bundleIdentifier` dans `app.json`.
- Le fichier d'appairage de SideStore peut expirer après une mise à jour d'iOS. Dans ce cas, suivre le guide « pairing file » de la documentation SideStore.
