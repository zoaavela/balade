import IconSettings from '@tabler/icons-react-native/IconSettings';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { formaterDistance } from '@/balade/mesures';
import { lieux, type Lieu } from '@/cartes/lieux';
import { Ecran } from '@/components/ecran';
import { Compte } from '@/compte/Compte';
import { distanceParcourue } from '@/db/rues';
import { useDeblocage } from '@/deblocage/Deblocage';
import { defis, estTermine } from '@/defis/defis';
import { formaterPas, lirePas, type Pas } from '@/pas/pas';
import { Parametres } from '@/parametres/Parametres';
import { EnteteProfil } from '@/profil/EnteteProfil';
import { TestReseau } from '@/rues/TestReseau';
import { Timbre } from '@/timbres/Timbre';
import { TimbreEnGrand } from '@/timbres/TimbreEnGrand';
import { couleurs, espace, polices, trait } from '@/theme';

const NB_DERNIERS = 4;
const ECART = 10;
const PENTES = [-3, 2, -1.5, 3]; // degrés : posés un peu de travers, comme sur la maquette

export default function Profil() {
  const { width } = useWindowDimensions();
  const { debloquees } = useDeblocage();
  const [metres, setMetres] = useState(0);
  // undefined : pas encore lu ; null : capteur indisponible ou refusé.
  const [pas, setPas] = useState<Pas | null | undefined>(undefined);
  const [enGrand, setEnGrand] = useState<Lieu | null>(null);
  const [parametres, setParametres] = useState(false);
  const [versionProfil, setVersionProfil] = useState(0); // relit l'en-tête après un changement

  // Recalculé à chaque ouverture de l'onglet, pour suivre les nouveaux points.
  useFocusEffect(
    useCallback(() => {
      setMetres(distanceParcourue());
      lirePas().then(setPas);
    }, []),
  );

  const derniers = lieux
    .filter((lieu) => debloquees.has(lieu.id))
    .sort((a, b) => debloquees.get(b.id)!.getTime() - debloquees.get(a.id)!.getTime())
    .slice(0, NB_DERNIERS);
  // Taille qui fait tenir quatre timbres au plus large format (grand) sur une ligne.
  const taille = Math.min(80, Math.floor((width - espace.m * 2 - ECART * (NB_DERNIERS - 1)) / (NB_DERNIERS * 1.3)));

  return (
    <Ecran
      titre="Profil"
      droite={
        <Pressable
          onPress={() => setParametres(true)}
          accessibilityRole="button"
          accessibilityLabel="Paramètres"
          hitSlop={12}>
          <IconSettings size={26} color={couleurs.encre} strokeWidth={2} />
        </Pressable>
      }>
      <ScrollView
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets // le clavier ne cache pas le champ du compte
      >
        <EnteteProfil key={versionProfil} />

        <View style={styles.rangee}>
          <Chiffre valeur={`${debloquees.size} / ${lieux.length}`} legende="Timbres" />
          <Chiffre
            valeur={`${defis.filter((d) => estTermine(d, debloquees)).length} / ${defis.length}`}
            legende="Défis"
          />
        </View>
        <View style={styles.rangee}>
          <Chiffre valeur={formaterDistance(metres)} legende="Parcourus" />
          <Chiffre
            valeur={pas ? formaterPas(pas.aujourdhui) : pas === null ? 'Indisponible' : '…'}
            legende={pas ? `Pas aujourd'hui, ${formaterPas(pas.total)} au total` : "Pas aujourd'hui"}
            attente={!pas}
          />
        </View>
        {pas === null && (
          <Text style={styles.vide}>
            Pour compter tes pas, autorise « Mouvements et forme » dans les réglages de l'app.
          </Text>
        )}

        <Text style={styles.sousTitre}>Derniers timbres</Text>
        {derniers.length === 0 ? (
          <Text style={styles.vide}>
            Aucun timbre pour l'instant. Passe près d'un lieu pour gagner le premier.
          </Text>
        ) : (
          <View style={styles.timbres}>
            {derniers.map((lieu, i) => (
              <View key={lieu.id} style={{ transform: [{ rotate: `${PENTES[i]}deg` }] }}>
                <Timbre
                  lieu={lieu}
                  taille={taille}
                  debloqueLe={debloquees.get(lieu.id)}
                  onPress={() => setEnGrand(lieu)}
                />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sousTitre}>Compte</Text>
        <Compte />

        {__DEV__ && <TestReseau />}
      </ScrollView>

      {parametres && (
        <Parametres
          onFermer={(change) => {
            setParametres(false);
            if (change) setVersionProfil((v) => v + 1);
          }}
        />
      )}

      {enGrand && (
        <TimbreEnGrand
          lieu={enGrand}
          debloqueLe={debloquees.get(enGrand.id)}
          onFermer={() => setEnGrand(null)}
        />
      )}
    </Ecran>
  );
}

// Une case : un grand chiffre et sa légende.
function Chiffre(props: { valeur: string; legende: string; attente?: boolean }) {
  return (
    <View style={styles.case}>
      <Text
        style={[styles.valeur, props.attente && styles.valeurAttente]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {props.valeur}
      </Text>
      <Text style={styles.legende}>{props.legende}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: {
    gap: espace.m,
    paddingTop: espace.m,
    paddingBottom: espace.xl,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
  },
  case: {
    flex: 1,
    padding: espace.m,
    backgroundColor: couleurs.fond,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  valeur: {
    fontFamily: polices.extraGras,
    fontSize: 30,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  valeurAttente: {
    color: couleurs.encreDouce,
  },
  legende: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.encreDouce,
  },
  sousTitre: {
    fontFamily: polices.extraGras,
    fontSize: 22,
    color: couleurs.encre,
    marginTop: espace.s,
  },
  vide: {
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encreDouce,
  },
  timbres: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: ECART,
    paddingVertical: espace.xs,
  },
});
