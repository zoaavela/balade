import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { useSession } from '@/compte/useSession';
import { espace } from '@/theme';

import { demanderChangementEmail, verifierCodeEmail } from './compte';
import { Feuille, stylesParametres as s } from './elements';

// Changer d'adresse e-mail : un code arrive sur chacune des deux adresses.
// Les deux sont demandés, pour qu'on ne puisse pas détourner le compte avec un téléphone
// déverrouillé, ni se tromper d'adresse.
export function ChangerEmail({ onRetour }: { onRetour: () => void }) {
  const { session } = useSession();
  const actuelle = session?.user.email ?? '';
  const [nouvelle, setNouvelle] = useState('');
  const [etape, setEtape] = useState<'adresse' | 'codes' | 'fait'>('adresse');
  const [codeAncienne, setCodeAncienne] = useState('');
  const [codeNouvelle, setCodeNouvelle] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function demander() {
    setOccupe(true);
    setErreur(null);
    const probleme = await demanderChangementEmail(nouvelle);
    setOccupe(false);
    if (probleme) setErreur(probleme);
    else setEtape('codes');
  }

  async function valider() {
    setOccupe(true);
    setErreur(null);
    const p1 = await verifierCodeEmail(actuelle, codeAncienne);
    const p2 = p1 ? null : await verifierCodeEmail(nouvelle, codeNouvelle);
    setOccupe(false);
    if (p1 || p2) setErreur(p1 ?? p2);
    else setEtape('fait');
  }

  return (
    <Feuille titre="Adresse e-mail" onRetour={onRetour} libelleRetour="Paramètres">
      {etape === 'adresse' && (
        <View style={{ gap: espace.m }}>
          <Text style={s.texte}>Adresse actuelle : {actuelle}</Text>
          <TextInput
            style={s.champ}
            value={nouvelle}
            onChangeText={setNouvelle}
            placeholder="Nouvelle adresse"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={demander}
          />
          {erreur && <Text style={s.erreur}>{erreur}</Text>}
          <Bouton titre={occupe ? 'Envoi…' : 'Recevoir les codes'} onPress={occupe ? () => {} : demander} />
        </View>
      )}

      {etape === 'codes' && (
        <View style={{ gap: espace.m }}>
          <Text style={s.texte}>
            Un code vient de partir sur chacune des deux adresses. Recopie-les ici.
          </Text>
          <Text style={s.texte}>Code reçu sur {actuelle}</Text>
          <TextInput
            style={s.champ}
            value={codeAncienne}
            onChangeText={setCodeAncienne}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={10}
          />
          <Text style={s.texte}>Code reçu sur {nouvelle.trim().toLowerCase()}</Text>
          <TextInput
            style={s.champ}
            value={codeNouvelle}
            onChangeText={setCodeNouvelle}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={10}
          />
          {erreur && <Text style={s.erreur}>{erreur}</Text>}
          <Bouton titre={occupe ? 'Vérification…' : 'Changer mon adresse'} onPress={occupe ? () => {} : valider} />
        </View>
      )}

      {etape === 'fait' && (
        <View style={{ gap: espace.m }}>
          <Text style={s.texte}>C'est fait. Tu te connecteras désormais avec {nouvelle.trim().toLowerCase()}.</Text>
          <Bouton titre="Retour aux paramètres" onPress={onRetour} />
        </View>
      )}
    </Feuille>
  );
}
