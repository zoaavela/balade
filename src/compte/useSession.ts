import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

// La session en cours : null si personne n'est connecté.
export function useSession(): { session: Session | null; chargee: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [chargee, setChargee] = useState(supabase === null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChargee(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => {
      setSession(nouvelle);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, chargee };
}
