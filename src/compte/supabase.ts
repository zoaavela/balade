import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

// Connexion au serveur Supabase.
// L'adresse et la clé viennent de .env.local (jamais dans le code, jamais dans Git).
// Seule la clé publique va ici : elle ne donne accès à rien sans les règles de sécurité
// par ligne côté serveur. La clé service_role ne doit jamais se trouver dans l'app.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clePublique = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// null tant que .env.local n'est pas rempli : l'app marche alors sans compte.
export const supabase: SupabaseClient | null =
  url && clePublique
    ? createClient(url, clePublique, {
        auth: {
          storage: Storage, // la session reste sur le téléphone, dans la base locale
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// La session se renouvelle seulement quand l'app est au premier plan.
if (supabase) {
  const client = supabase;
  AppState.addEventListener('change', (statut) => {
    if (statut === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}
