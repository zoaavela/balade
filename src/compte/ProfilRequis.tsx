import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices, trait } from '@/theme';

import { choisirCompteProfil, creerProfil, lireProfil, problemeUsername, usernameRetenu } from './profil';
import { supabase } from './supabase';

// Le username est obligatoire (T29) : juste après la connexion, l'app le demande avant
// d'ouvrir les onglets. Une fois choisi, il est retenu sur le téléphone.
// Sans réseau, on laisse entrer : la question reviendra au prochain lancement connecté.
export function ProfilRequis({ userId, children }: { userId: string; children: ReactNode }) {
  choisirCompteProfil(userId);
  const [etat, setEtat] = useState<'verification' | 'a-choisir' | 'ok'>(() =>
    usernameRetenu(userId) ? 'ok' : 'verification',
  );

  useEffect(() => {
    if (etat !== 'verification') return;
    lireProfil()
      .then((p) => setEtat(p ? 'ok' : 'a-choisir'))
      .catch(() => setEtat('ok'));
  }, [etat]);

  if (etat === 'ok') return <>{children}</>;
  if (etat === 'verification') {
    return (
      <View style={[styles.ecran, styles.centre]}>
        <ActivityIndicator color={couleurs.encre} />
      </View>
    );
  }
  return <ChoixUsername onChoisi={() => setEtat('ok')} />;
}

function ChoixUsername({ onChoisi }: { onChoisi: () => void }) {
  const marges = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function valider() {
    const u = username.trim();
    const probleme = problemeUsername(u);
    if (probleme) return setErreur(probleme);
    setOccupe(true);
    const e = await creerProfil(u);
    setOccupe(false);
    if (e) setErreur(e);
    else onChoisi();
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.ecran}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          { paddingTop: marges.top + espace.xl, paddingBottom: marges.bottom + espace.l },
        ]}>
        <Text style={styles.titre}>Choisis ton username</Text>
        <Text style={styles.texte}>
          C&apos;est ton nom dans l&apos;app. Pas besoin de ton vrai nom : de 3 à 20 caractères, avec
          des lettres, des chiffres, le point et le tiret bas.
        </Text>
        <View style={styles.champ}>
          <Text style={styles.arobase}>@</Text>
          <TextInput
            style={styles.saisie}
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setErreur(null);
            }}
            placeholder="ton.username"
            placeholderTextColor={couleurs.encreDouce}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={20}
            editable={!occupe}
            onSubmitEditing={valider}
            returnKeyType="done"
          />
        </View>
        {erreur && <Text style={styles.erreur}>{erreur}</Text>}
        <Text style={styles.aide}>Tu pourras le changer plus tard, une fois tous les 30 jours.</Text>
        {occupe ? (
          <ActivityIndicator color={couleurs.encre} />
        ) : (
          <Bouton titre="Continuer" onPress={valider} />
        )}
        <Text style={styles.lien} onPress={() => supabase?.auth.signOut()} suppressHighlighting>
          Se déconnecter
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espace.l,
    gap: espace.m,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 32,
    lineHeight: 36,
    color: couleurs.encre,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 18,
    lineHeight: 26,
    color: couleurs.encre,
  },
  champ: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 12,
    paddingHorizontal: espace.m,
  },
  arobase: {
    fontFamily: polices.extraGras,
    fontSize: 20,
    color: couleurs.encre,
    marginRight: 2,
  },
  saisie: {
    flex: 1,
    fontFamily: polices.moyen,
    fontSize: 18,
    color: couleurs.encre,
    paddingVertical: espace.s + 4,
  },
  erreur: {
    fontFamily: polices.gras,
    fontSize: 15,
    color: couleurs.brique,
  },
  aide: {
    fontFamily: polices.normal,
    fontSize: 14,
    color: couleurs.encreDouce,
  },
  lien: {
    alignSelf: 'center',
    fontFamily: polices.moyen,
    fontSize: 15,
    color: couleurs.encre,
    textDecorationLine: 'underline',
    paddingVertical: espace.s,
  },
});
