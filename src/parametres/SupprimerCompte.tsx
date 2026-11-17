import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { oublierUsername } from '@/compte/profil';
import { supabase } from '@/compte/supabase';
import { useSession } from '@/compte/useSession';
import { effacerBaseCompte } from '@/db/base';
import { espace } from '@/theme';

import { supprimerCompte } from './compte';
import { Feuille, stylesParametres as s } from './elements';

const MOT = 'SUPPRIMER';

// Suppression du compte en deux temps : on explique, puis on fait taper SUPPRIMER.
// Le serveur efface tout (fonction supprimer-compte), puis le téléphone efface sa base.
export function SupprimerCompte({ onRetour }: { onRetour: () => void }) {
  const { session } = useSession();
  const [etape, setEtape] = useState<'explication' | 'confirmation'>('explication');
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function supprimer() {
    if (saisie.trim().toUpperCase() !== MOT) {
      setErreur(`Tape ${MOT} pour confirmer.`);
      return;
    }
    setOccupe(true);
    setErreur(null);
    const probleme = await supprimerCompte();
    if (probleme) {
      setOccupe(false);
      setErreur(probleme);
      return;
    }
    // Le compte n'existe plus : la session se ferme ici seulement, puis la base locale
    // est effacée une fois les écrans fermés.
    if (session) oublierUsername(session.user.id);
    await supabase?.auth.signOut({ scope: 'local' });
    setTimeout(effacerBaseCompte, 500);
  }

  return (
    <Feuille titre="Supprimer mon compte" onRetour={onRetour} libelleRetour="Paramètres">
      {etape === 'explication' ? (
        <View style={{ gap: espace.m }}>
          <Text style={s.texte}>
            Ton compte et tout ce qu'il contient seront effacés pour de bon : profil, photo, timbres,
            rues parcourues, kilomètres, pas et réglages. Sur le serveur comme sur ce téléphone.
          </Text>
          <Text style={s.texte}>On ne pourra rien récupérer. Si tu veux garder une copie, télécharge d'abord tes données.</Text>
          <Bouton titre="Continuer" onPress={() => setEtape('confirmation')} />
        </View>
      ) : (
        <View style={{ gap: espace.m }}>
          <Text style={s.texte}>Pour confirmer, tape {MOT} ci-dessous.</Text>
          <TextInput
            style={s.champ}
            value={saisie}
            onChangeText={setSaisie}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={MOT}
          />
          {erreur && <Text style={s.erreur}>{erreur}</Text>}
          <Bouton
            titre={occupe ? 'Suppression…' : 'Supprimer définitivement'}
            onPress={occupe ? () => {} : supprimer}
          />
        </View>
      )}
    </Feuille>
  );
}
