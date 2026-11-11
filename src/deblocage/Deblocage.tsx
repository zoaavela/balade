import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import type { Point } from '@/balade/mesures';
import type { Lieu } from '@/cartes/lieux';
import { cartesDebloquees, debloquer } from '@/db/cartes';

import { lieuxAtteints } from './lieuxAtteints';
import { NouvelleCarte } from './NouvelleCarte';

type Valeur = {
  debloquees: Map<string, Date>; // lieu_id et date de déblocage
  traiterPoint: (point: Point) => void; // à appeler pour chaque nouvelle position
  rafraichir: () => void; // relit les cartes depuis la base (après une synchronisation)
};

const Contexte = createContext<Valeur | null>(null);

// Le gestionnaire de déblocage, branché une fois pour toute l'app.
// Il reçoit les positions, enregistre les nouvelles cartes et les montre une par une.
export function DeblocageProvider({ children }: { children: ReactNode }) {
  const [debloquees, setDebloquees] = useState(() => cartesDebloquees());
  const [aMontrer, setAMontrer] = useState<{ lieu: Lieu; date: Date }[]>([]);
  // Copie à jour des ids débloqués, lue à chaque point sans attendre un nouvel affichage.
  const ids = useRef<Set<string> | null>(null);

  const traiterPoint = useCallback((point: Point) => {
    if (!ids.current) ids.current = new Set(cartesDebloquees().keys());
    const atteints = lieuxAtteints(point, ids.current);
    if (atteints.length === 0) return;

    const date = new Date();
    const nouveaux = atteints.filter((lieu) => debloquer(lieu.id, date));
    nouveaux.forEach((lieu) => ids.current?.add(lieu.id));
    if (nouveaux.length === 0) return;

    setDebloquees(cartesDebloquees());
    setAMontrer((file) => [...file, ...nouveaux.map((lieu) => ({ lieu, date }))]);
  }, []);

  const rafraichir = useCallback(() => {
    const cartes = cartesDebloquees();
    ids.current = new Set(cartes.keys());
    setDebloquees(cartes);
  }, []);

  const enCours = aMontrer[0];

  return (
    <Contexte.Provider value={{ debloquees, traiterPoint, rafraichir }}>
      {children}
      {enCours && (
        <NouvelleCarte
          key={enCours.lieu.id}
          lieu={enCours.lieu}
          date={enCours.date}
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
