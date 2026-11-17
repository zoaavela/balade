import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';

import { Bouton } from '@/components/bouton';
import { couleurs } from '@/theme';

import { deconnecterPartout, lireAppareils, type Appareil } from './compte';
import { Feuille, Ligne, Section, stylesParametres as s } from './elements';

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// Les sessions ouvertes du compte, et « Se déconnecter partout ».
export function Appareils({ onRetour }: { onRetour: () => void }) {
  const [appareils, setAppareils] = useState<Appareil[] | null | undefined>(undefined);

  useEffect(() => {
    lireAppareils().then(setAppareils).catch(() => setAppareils(null));
  }, []);

  function partout() {
    Alert.alert(
      'Se déconnecter partout ?',
      'Tous tes appareils seront déconnectés, celui-ci compris. Il faudra te reconnecter avec un code.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout déconnecter',
          style: 'destructive',
          onPress: () =>
            deconnecterPartout().catch(() =>
              Alert.alert('Pas de réseau', "La déconnexion n'est pas passée. Réessaie dans un moment."),
            ),
        },
      ],
    );
  }

  return (
    <Feuille titre="Appareils" onRetour={onRetour} libelleRetour="Paramètres">
      {appareils === undefined && <ActivityIndicator color={couleurs.encre} />}
      {appareils === null && <Text style={s.texte}>Liste indisponible sans réseau.</Text>}
      {appareils && (
        <Section titre="Connectés à ton compte">
          {appareils.map((a) => (
            <Ligne
              key={a.id}
              titre={a.actuel ? `${a.nom}, celui-ci` : a.nom}
              detail={`Actif le ${a.vueLe.getDate()} ${MOIS[a.vueLe.getMonth()]} ${a.vueLe.getFullYear()}`}
            />
          ))}
        </Section>
      )}
      <Bouton titre="Se déconnecter partout" onPress={partout} />
    </Feuille>
  );
}
