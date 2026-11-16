# Mise en place de Supabase

Supabase héberge les comptes et, à partir du T13, la sauvegarde de la collection. Offre gratuite suffisante.

## 1. Créer le projet

1. Sur https://supabase.com, créer un compte, puis **New project**.
2. Nom : `balade`. Région : **West EU (Paris)** si proposée, sinon une région européenne.
3. Choisir un mot de passe de base de données solide et le garder dans un gestionnaire de mots de passe. Il ne va nulle part dans l'app.

## 2. Créer les tables

1. Menu de gauche : **SQL Editor**, puis **New query**.
2. Coller tout le contenu de `supabase/migrations/0001_init.sql`, puis **Run**.
3. Vérifier dans **Table Editor** que `cartes_debloquees` et `points` existent, avec la mention RLS activée.

## 3. Connexion par code

Dans **Authentication**, puis **Emails** (ou **Email Templates**) :

1. Ouvrir le modèle **Magic Link** et remplacer son contenu par :
   `<h2>Ton code</h2><p>{{ .Token }}</p><p>Il expire dans une heure.</p>`
2. Faire de même pour le modèle **Confirm signup**.

Sans ça, Supabase envoie un lien au lieu d'un code.

Limite à connaître : sans serveur d'envoi d'e-mails personnalisé, Supabase n'envoie qu'environ deux e-mails par heure, et seulement aux adresses des membres du projet. Pour toi seul, ça suffit.

## 4. Brancher l'app

1. **Project Settings**, puis **API** (ou **Data API**) : copier l'adresse du projet (**Project URL**) et la clé publique (**anon** ou **publishable**).
2. Dans le dossier du projet, copier `.env.example` en `.env.local` et remplir `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Relancer `npx expo start --go` : les variables ne sont lues qu'au démarrage.

Ne jamais copier la clé **service_role** (ou **secret**) : elle contourne toutes les règles de sécurité.

## 5. Vérifier la sécurité

1. **Authentication**, **Users**, **Add user**, **Create new user** : créer deux comptes de test avec mot de passe, en cochant **Auto Confirm User**. Des adresses inventées suffisent, par exemple `test-a@balade.invalid`.
2. Remplir `TEST_A_EMAIL`, `TEST_A_PASSWORD`, `TEST_B_EMAIL` et `TEST_B_PASSWORD` dans `.env.local`.
3. Lancer `npm run test:rls`. Chaque ligne doit commencer par OK, et la dernière dire « Tout est bon. ».

## 6. Profils : username et bio (T29)

1. **SQL Editor**, **New query** : coller tout `supabase/migrations/0002_profils.sql`, puis **Run**.
2. **Table Editor** : la table `profils` existe, avec la mention RLS activée.
3. Lancer `npm run test:rls` : les nouvelles lignes sur les profils doivent toutes dire OK. La première fois, le script crée les profils `test_rls_a` et `test_rls_b`.

Dès que cette migration est faite, l'app demande un username après la connexion. Avant, elle laisse entrer sans rien demander.

## 7. Photos de profil : Cloudflare R2 (T29)

Les photos sont sur Cloudflare R2, dans un espace privé : personne ne peut les lire sans un lien signé donné par le serveur. Gratuit jusqu'à 10 Go, mais Cloudflare demande une carte bancaire pour activer R2.

1. Créer un compte sur https://dash.cloudflare.com, puis menu **R2 Object Storage**, et activer R2.
2. **Create bucket** : nom `balade-photos`. **Location** : choisir **Specify jurisdiction**, puis **European Union**, pour que les photos restent en Europe. Laisser l'accès public désactivé.
3. Dans le bucket, onglet **Settings**, **Object lifecycle rules**, **Add rule** : nom `attente`, préfixe `attente/`, supprimer les objets après **1 jour**. Les photos envoyées mais jamais validées disparaissent ainsi seules.
4. Retour à **R2 Object Storage**, **Manage API tokens** (ou **API**, **Manage R2 API Tokens**), **Create API token** :
   - permission **Object Read & Write** ;
   - **Specify bucket(s)** : seulement `balade-photos` ;
   - créer, puis noter l'**Access Key ID**, la **Secret Access Key** et l'adresse **S3** affichée pour l'Union européenne (elle ressemble à `https://<identifiant>.eu.r2.cloudflarestorage.com`). La clé secrète ne s'affiche qu'une fois.

Ces clés ne vont jamais dans l'app ni dans `.env.local` : uniquement dans les secrets de Supabase, à l'étape suivante.

## 8. Fonction photo-profil (T29)

1. Dans Supabase : **Edge Functions**, **Secrets** (ou **Project Settings**, **Edge Functions**). Ajouter :
   - `R2_ACCESS_KEY_ID` : l'Access Key ID ;
   - `R2_SECRET_ACCESS_KEY` : la Secret Access Key ;
   - `R2_ENDPOINT` : l'adresse S3, sans le nom du bucket à la fin ;
   - `R2_BUCKET` : `balade-photos`.
2. **Edge Functions**, **Deploy a new function**, **Via Editor**. Nom : `photo-profil` (exactement). Remplacer le code proposé par tout le contenu de `supabase/functions/photo-profil/index.ts`, puis **Deploy**.
3. Laisser **Enforce JWT verification** (ou **Verify JWT**) activé : seule une session valide peut appeler la fonction. La fonction le revérifie elle-même.
4. Dans l'app, Profil : toucher l'avatar, choisir une photo. Elle doit apparaître après quelques secondes. En cas d'erreur, l'onglet **Logs** de la fonction dit pourquoi.
