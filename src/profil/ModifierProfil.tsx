import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton } from '@/components/bouton';
import { BIO_MAX, modifierProfil, problemeUsername, usernameBloqueJusquA, type Profil } from '@/compte/profil';
import { couleurs, espace, polices, trait } from '@/theme';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Modifier son username et sa bio (T29). La photo se change en touchant l'avatar.
// onFermer(true) si quelque chose a été enregistré.
export function ModifierProfil({ profil, onFermer }: { profil: Profil; onFermer: (change: boolean) => void }) {
  const marges = useSafeAreaInsets();
  const [username, setUsername] = useState(profil.username);
  const [bio, setBio] = useState(profil.bio);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const bloque = usernameBloqueJusquA(profil);

  async function enregistrer() {
    const u = username.trim();
    const champs: { username?: string; bio?: string } = {};
    if (u !== profil.username) {
      const probleme = problemeUsername(u);
      if (probleme) return setErreur(probleme);
      champs.username = u;
    }
    const b = bio.trim();
    if (b !== profil.bio) champs.bio = b;
    if (!champs.username && champs.bio === undefined) return onFermer(false);
    setOccupe(true);
    const e = await modifierProfil(champs);
    setOccupe(false);
    if (e) setErreur(e);
    else onFermer(true);
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onFermer(false)}>
      <KeyboardAvoidingView behavior="padding" style={styles.ecran}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.page, { paddingBottom: marges.bottom + espace.l }]}>
          <Text style={styles.titre}>Modifier le profil</Text>

          <Text style={styles.etiquette}>Username</Text>
          <View style={[styles.champ, bloque && styles.champBloque]}>
            <Text style={styles.arobase}>@</Text>
            <TextInput
              style={styles.saisie}
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                setErreur(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              maxLength={20}
              editable={!bloque && !occupe}
            />
          </View>
          <Text style={styles.aide}>
            {bloque
              ? `Tu pourras le changer à partir du ${bloque.getDate()} ${MOIS[bloque.getMonth()]}.`
              : 'Une fois changé, il reste 30 jours avant le prochain changement.'}
          </Text>

          <Text style={styles.etiquette}>Bio</Text>
          <TextInput
            style={[styles.champ, styles.bio]}
            value={bio}
            onChangeText={(t) => {
              setBio(t);
              setErreur(null);
            }}
            placeholder="Quelques mots sur toi."
            placeholderTextColor={couleurs.encreDouce}
            multiline
            maxLength={BIO_MAX}
            editable={!occupe}
          />
          <Text style={styles.compteur}>
            {bio.length} / {BIO_MAX}
          </Text>

          {erreur && <Text style={styles.erreur}>{erreur}</Text>}
          {occupe ? (
            <ActivityIndicator color={couleurs.encre} />
          ) : (
            <View style={styles.boutons}>
              <Bouton titre="Enregistrer" onPress={enregistrer} />
              <Bouton titre="Annuler" variante="clair" onPress={() => onFermer(false)} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  page: {
    padding: espace.l,
    gap: espace.s,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 28,
    color: couleurs.encre,
    marginBottom: espace.s,
  },
  etiquette: {
    fontFamily: polices.gras,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: couleurs.encre,
    marginTop: espace.m,
  },
  champ: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 12,
    paddingHorizontal: espace.m,
    backgroundColor: couleurs.papier,
  },
  champBloque: {
    opacity: 0.5,
  },
  arobase: {
    fontFamily: polices.extraGras,
    fontSize: 18,
    color: couleurs.encre,
    marginRight: 2,
  },
  saisie: {
    flex: 1,
    fontFamily: polices.moyen,
    fontSize: 17,
    color: couleurs.encre,
    paddingVertical: espace.s + 4,
  },
  bio: {
    minHeight: 96,
    paddingVertical: espace.s + 4,
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encre,
    textAlignVertical: 'top',
  },
  aide: {
    fontFamily: polices.normal,
    fontSize: 13,
    color: couleurs.encreDouce,
  },
  compteur: {
    alignSelf: 'flex-end',
    fontFamily: polices.moyen,
    fontSize: 13,
    color: couleurs.encreDouce,
    fontVariant: ['tabular-nums'],
  },
  erreur: {
    fontFamily: polices.gras,
    fontSize: 15,
    color: couleurs.brique,
    marginTop: espace.s,
  },
  boutons: {
    gap: espace.s,
    marginTop: espace.m,
  },
});
