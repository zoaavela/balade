import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { nettoyerJpeg } from './jpeg';
import { supabase } from './supabase';

// Photo de profil (T29), stockée sur Cloudflare R2 dans un bucket privé.
// L'app n'a aucune clé R2 : la fonction Supabase photo-profil vérifie la session et
// donne des liens signés et temporaires, puis contrôle le fichier reçu.
//
// Avant l'envoi : recadrée en carré de 512 px, réencodée en JPEG, et toutes ses
// métadonnées retirées (position GPS de la prise de vue comprise).

const COTE = 512;
const TAILLE_MAX = 2 * 1024 * 1024;

type Reponse = { cle?: string; url?: string | null; ok?: boolean; erreur?: string };

async function appeler(corps: Record<string, unknown>): Promise<Reponse> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { data, error } = await supabase.functions.invoke<Reponse>('photo-profil', { body: corps });
  if (error) throw error;
  return data ?? {};
}

// 'annule' si rien n'a été choisi. Lève une erreur avec un message lisible sinon.
export async function choisirEtEnvoyerPhoto(): Promise<'ok' | 'annule'> {
  const choix = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });
  if (choix.canceled || !choix.assets[0]) return 'annule';
  const { uri, width, height } = choix.assets[0];

  // Carré central, puis 512 px. Réencoder en JPEG ne garde pas les métadonnées d'origine,
  // et le nettoyage retire ce que l'encodeur d'iOS aurait pu ajouter.
  const cote = Math.min(width, height);
  const contexte = ImageManipulator.manipulate(uri);
  contexte.crop({ originX: (width - cote) / 2, originY: (height - cote) / 2, width: cote, height: cote });
  contexte.resize({ width: COTE, height: COTE });
  const image = await contexte.renderAsync();
  const enregistree = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  const octets = nettoyerJpeg(await new File(enregistree.uri).bytes());
  if (octets.length > TAILLE_MAX) throw new Error('Photo trop lourde, essaie une autre image.');

  const lien = await appeler({ action: 'lien_envoi' });
  if (!lien.cle || !lien.url) throw new Error('Envoi impossible pour le moment.');
  const envoi = await fetch(lien.url, {
    method: 'PUT',
    headers: { 'content-type': 'image/jpeg' },
    body: octets,
  });
  if (!envoi.ok) throw new Error('Envoi impossible pour le moment.');

  const verification = await appeler({ action: 'valider', cle: lien.cle });
  if (!verification.ok) throw new Error('La photo a été refusée par le serveur.');
  oublierLien();
  return 'ok';
}

export async function supprimerPhoto() {
  await appeler({ action: 'supprimer' });
  oublierLien();
}

// Lien de lecture de sa propre photo, valable une heure. Gardé 50 minutes en mémoire.
let lien: { url: string | null; jusqua: number } | null = null;

export async function lienPhoto(): Promise<string | null> {
  if (lien && lien.jusqua > Date.now()) return lien.url;
  const r = await appeler({ action: 'lien_lecture' });
  lien = { url: r.url ?? null, jusqua: Date.now() + 50 * 60 * 1000 };
  return lien.url;
}

export function oublierLien() {
  lien = null;
}
