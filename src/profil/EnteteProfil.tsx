import IconCamera from '@tabler/icons-react-native/IconCamera';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { choisirEtEnvoyerPhoto, lienPhoto, supprimerPhoto } from '@/compte/photo';
import { useProfil, type Profil } from '@/compte/profil';
import { couleurs, espace, polices, trait } from '@/theme';

import { ModifierProfil } from './ModifierProfil';

const AVATAR = 76;

// Haut du Profil (T29), d'après docs/maquettes/profil-defis.html : photo ronde (ou
// l'initiale sur ocre), petit appareil photo pour la changer, @username et bio.
export function EnteteProfil() {
  const { profil, relire } = useProfil();
  const [modifier, setModifier] = useState(false);

  if (profil === undefined) return <ActivityIndicator color={couleurs.encre} style={styles.attente} />;
  if (profil === null) {
    return <Text style={styles.horsLigne}>Profil indisponible sans réseau.</Text>;
  }

  return (
    <View style={styles.cadre}>
      <View style={styles.rangee}>
        <Avatar profil={profil} onChange={relire} />
        <View style={styles.textes}>
          <Text style={styles.username} numberOfLines={1} adjustsFontSizeToFit>
            @{profil.username}
          </Text>
          <Text style={[styles.bio, !profil.bio && styles.bioVide]}>
            {profil.bio || 'Pas encore de bio.'}
          </Text>
        </View>
      </View>
      <Bouton titre="Modifier le profil" onPress={() => setModifier(true)} />
      {modifier && (
        <ModifierProfil
          profil={profil}
          onFermer={(change) => {
            setModifier(false);
            if (change) relire();
          }}
        />
      )}
    </View>
  );
}

function Avatar({ profil, onChange }: { profil: Profil; onChange: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    let actif = true;
    if (!profil.aPhoto) setUrl(null);
    else lienPhoto().then((u) => actif && setUrl(u)).catch(() => {});
    return () => {
      actif = false;
    };
  }, [profil.aPhoto]);

  async function changer() {
    try {
      setOccupe(true);
      if ((await choisirEtEnvoyerPhoto()) === 'ok') onChange();
    } catch (e) {
      Alert.alert('Photo non envoyée', e instanceof Error ? e.message : 'Réessaie dans un moment.');
    } finally {
      setOccupe(false);
    }
  }

  function menu() {
    if (!profil.aPhoto) return changer();
    Alert.alert('Photo de profil', undefined, [
      { text: 'Choisir une autre photo', onPress: changer },
      {
        text: 'Retirer la photo',
        style: 'destructive',
        onPress: async () => {
          await supprimerPhoto().catch(() => Alert.alert('Photo non retirée', 'Réessaie dans un moment.'));
          onChange();
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  return (
    <Pressable onPress={menu} accessibilityRole="button" accessibilityLabel="Changer la photo de profil">
      <View style={styles.avatar}>
        {url ? (
          <Image source={{ uri: url }} style={styles.photo} />
        ) : (
          <Text style={styles.initiale}>{profil.username[0].toUpperCase()}</Text>
        )}
        {occupe && (
          <View style={styles.voile}>
            <ActivityIndicator color={couleurs.fond} />
          </View>
        )}
      </View>
      <View style={styles.badge}>
        <IconCamera size={15} color={couleurs.fond} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  attente: {
    paddingVertical: espace.l,
  },
  horsLigne: {
    fontFamily: polices.moyen,
    fontSize: 15,
    color: couleurs.encreDouce,
  },
  cadre: {
    gap: espace.m,
  },
  rangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textes: {
    flex: 1,
  },
  username: {
    fontFamily: polices.extraGras,
    fontSize: 22,
    color: couleurs.encre,
  },
  bio: {
    fontFamily: polices.normal,
    fontSize: 14,
    lineHeight: 19,
    color: couleurs.encre,
    marginTop: 3,
  },
  bioVide: {
    color: couleurs.encreDouce,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: trait,
    borderColor: couleurs.encre,
    backgroundColor: couleurs.ocre,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  initiale: {
    fontFamily: polices.extraGras,
    fontSize: 32,
    color: couleurs.encre,
  },
  voile: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(33, 29, 26, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: couleurs.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
