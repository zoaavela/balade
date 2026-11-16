import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { Point } from '@/balade/mesures';
import type { Lieu } from '@/cartes/lieux';
import { cartesDebloquees } from '@/db/cartes';
import { enregistrerDeblocages } from '@/suivi/enregistrer';
import { dansExpoGo } from '@/suivi/environnement';
import { surDefisTermines, surNouvellesCartes } from '@/suivi/evenements';
import { surveillerLieux } from '@/suivi/zones';

import { lieuxAtteints } from './lieuxAtteints';
import { signalerSecretsProches } from './secretsProches';
import { NouvelleCarte } from './NouvelleCarte';
import { DefiTermine } from '@/defis/DefiTermine';
import type { Defi } from '@/defis/defis';

type Valeur = {
  debloquees: Map<string, Date>; // lieu_id et date de déblocage
  traiterPoint: (point: Point) => void; // position simulée (menu de développement)
  rafraichir: () => void; // relit les cartes depuis la base (après une synchronisation)
};

type AMontrer = { genre: 'carte'; lieu: Lieu; date: Date } | { genre: 'defi'; defi: Defi };

const Contexte = createContext<Valeur | null>(null);

// Le gestionnaire de déblocage, branché une fois pour toute l'app.
// Le suivi (suivi/enregistrer.ts) écrit les déblocages et les annonce ; ici on les montre
// un par un et on tient à jour la liste des cartes pour les écrans.
export function DeblocageProvider({ children }: { children: ReactNode }) {
  const [debloquees, setDebloquees] = useState(() => cartesDebloquees());
  // File d'attente des écrans plein écran : les nouvelles cartes, puis les défis terminés.
  const [aMontrer, setAMontrer] = useState<AMontrer[]>([]);

  useEffect(
    () =>
      surNouvellesCartes(({ lieux, date }) => {
        setDebloquees(cartesDebloquees());
        setAMontrer((file) => [...file, ...lieux.map((lieu) => ({ genre: 'carte' as const, lieu, date }))]);
      }),
    [],
  );
  useEffect(
    () =>
      surDefisTermines((termines) =>
        setAMontrer((file) => [...file, ...termines.map((defi) => ({ genre: 'defi' as const, defi }))]),
      ),
    [],
  );

  // iOS surveille les lieux restants, pour débloquer même app fermée (build seulement).
  useEffect(() => {
    if (!dansExpoGo) surveillerLieux(new Set(debloquees.keys()));
  }, [debloquees]);

  const traiterPoint = useCallback((point: Point) => {
    enregistrerDeblocages(lieuxAtteints(point, new Set(cartesDebloquees().keys())));
    signalerSecretsProches([point], new Set(cartesDebloquees().keys()));
  }, []);

  const rafraichir = useCallback(() => setDebloquees(cartesDebloquees()), []);

  const enCours = aMontrer[0];

  return (
    <Contexte.Provider value={{ debloquees, traiterPoint, rafraichir }}>
      {children}
      {enCours?.genre === 'carte' && (
        <NouvelleCarte
          key={enCours.lieu.id}
          lieu={enCours.lieu}
          date={enCours.date}
          encoreApres={aMontrer.length - 1}
          onFermer={() => setAMontrer((file) => file.slice(1))}
        />
      )}
      {enCours?.genre === 'defi' && (
        <DefiTermine
          key={enCours.defi.id}
          defi={enCours.defi}
          encoreApres={aMontrer.length - 1}
          onFermer={() => setAMontrer((file) => file.slice(1))}
        />
      )}
    </Contexte.Provider>
  );
}

export function useDeblocage(): Valeur {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useDeblocage doit être utilisé dans DeblocageProvider');
  return valeur;
}
