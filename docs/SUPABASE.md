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
