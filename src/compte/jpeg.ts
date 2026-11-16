// Retire toutes les métadonnées d'un JPEG avant l'envoi (T29) : Exif (avec la position
// GPS de la prise de vue), XMP, IPTC, commentaires. Seuls restent l'image, l'en-tête
// JFIF (APP0), le profil de couleurs (APP2) et le bloc Adobe (APP14).
// Le serveur refait la même vérification (supabase/functions/photo-profil) : un fichier
// qui garderait une métadonnée serait refusé.

export function nettoyerJpeg(b: Uint8Array): Uint8Array<ArrayBuffer> {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error('Pas un JPEG');
  const morceaux: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error('JPEG abîmé');
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd9) { morceaux.push(b.subarray(i, i + 2)); break; }
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { morceaux.push(b.subarray(i, i + 2)); i += 2; continue; }
    const longueur = (b[i + 2] << 8) | b[i + 3];
    if (longueur < 2 || i + 2 + longueur > b.length) throw new Error('JPEG abîmé');
    let fin = i + 2 + longueur;
    if (m === 0xda) {
      // Données de l'image : gardées telles quelles jusqu'au prochain vrai marqueur.
      while (fin + 1 < b.length && !(b[fin] === 0xff && b[fin + 1] !== 0x00 && (b[fin + 1] < 0xd0 || b[fin + 1] > 0xd7))) fin++;
    }
    const metadonnee = (m >= 0xe1 && m <= 0xef && m !== 0xe2 && m !== 0xee) || m === 0xfe;
    if (!metadonnee) morceaux.push(b.subarray(i, fin));
    i = fin;
  }
  const total = morceaux.reduce((s, x) => s + x.length, 0);
  const sortie = new Uint8Array(total);
  let k = 0;
  for (const x of morceaux) {
    sortie.set(x, k);
    k += x.length;
  }
  return sortie;
}
