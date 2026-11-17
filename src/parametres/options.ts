import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { ecrireReglage, lireReglage } from '@/db/reglages';

// Réglages du téléphone (T32, partie 2) : suivi, notifications, affichage. Rangés dans la
// base de l'appareil (`reglages`), jamais synchronisés.

export type Options = {
  suivi_fond: boolean; // suivi en arrière-plan (build seulement, sans effet dans Expo Go)
  economie: boolean; // moins de positions, plus de batterie
  synchro_wifi: boolean; // synchroniser seulement en Wi-Fi
  notif_nouveau_timbre: boolean;
  vibrations: boolean;
  reflet: boolean; // reflet des timbres en grand
  animations_reduites: boolean;
};

const DEFAUTS: Options = {
  suivi_fond: true,
  economie: false,
  synchro_wifi: false,
  notif_nouveau_timbre: true,
  vibrations: true,
  reflet: true,
  animations_reduites: false,
};

const cle = (nom: keyof Options) => `option_${nom}`;
const abonnes = new Set<() => void>();

export function option(nom: keyof Options): boolean {
  const v = lireReglage(cle(nom));
  return v === null ? DEFAUTS[nom] : v === '1';
}

export function changerOption(nom: keyof Options, valeur: boolean) {
  ecrireReglage(cle(nom), valeur ? '1' : '0');
  abonnes.forEach((f) => f());
}

export function surChangementOptions(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

function toutes(): Options {
  return Object.fromEntries((Object.keys(DEFAUTS) as (keyof Options)[]).map((n) => [n, option(n)])) as Options;
}

export function useOptions(): Options {
  const [options, setOptions] = useState<Options>(toutes);
  useEffect(() => surChangementOptions(() => setOptions(toutes())), []);
  return options;
}

// Le réglage d'accessibilité « Réduire les animations » de l'iPhone, suivi en direct.
export function useReductionSysteme(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setActive).catch(() => {});
    const abonnement = AccessibilityInfo.addEventListener('reduceMotionChanged', setActive);
    return () => abonnement.remove();
  }, []);
  return active;
}

// Animations réduites : choisi dans l'app, ou imposé par le réglage du téléphone.
export function useAnimationsReduites(): boolean {
  const { animations_reduites } = useOptions();
  return useReductionSysteme() || animations_reduites;
}
