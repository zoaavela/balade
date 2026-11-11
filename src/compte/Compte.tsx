import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices, trait } from '@/theme';

import { supabase } from './supabase';
import { useSession } from './useSession';

const ATTENTE_RENVOI = 60; // secondes avant de pouvoir redemander un code

// Section « Compte » du Profil : connexion par code reçu par e-mail.
// Le compte est facultatif, l'app marche sans.
export function Compte() {
  const { session, chargee } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [renvoiDans, setRenvoiDans] = useState(0);

  // Compte à rebours avant de pouvoir redemander un code.
  useEffect(() => {
    if (renvoiDans <= 0) return;
    const minuteur = setTimeout(() => setRenvoiDans(renvoiDans - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [renvoiDans]);

  if (!supabase) {
    return (
      <Cadre>
        <Text style={styles.texte}>Les comptes ne sont pas encore configurés sur ce téléphone.</Text>
      </Cadre>
    );
  }
  const client = supabase;

  if (!chargee) {
    return (
      <Cadre>
        <ActivityIndicator color={couleurs.encre} />
      </Cadre>
    );
  }

  if (session) {
    return (
      <Cadre>
        <Text style={styles.texte}>Connecté avec {session.user.email}</Text>
        <Bouton titre="Se déconnecter" variante="clair" onPress={() => client.auth.signOut()} />
      </Cadre>
    );
  }

  async function envoyerCode() {
    const adresse = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse) || adresse.length > 254) {
      setErreur("Cette adresse e-mail n'a pas l'air valide.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    const { error } = await client.auth.signInWithOtp({
      email: adresse,
      options: { shouldCreateUser: true },
    });
    setOccupe(false);
    if (error) {
      setErreur(
        error.status === 429
          ? 'Trop de demandes. Réessaie dans quelques minutes.'
          : "Le code n'a pas pu être envoyé. Réessaie plus tard.",
      );
      return;
    }
    setEmail(adresse);
    setEtape('code');
    setRenvoiDans(ATTENTE_RENVOI);
  }

  async function validerCode() {
    const chiffres = code.replace(/\D/g, '');
    if (chiffres.length < 6 || chiffres.length > 8) {
      setErreur('Le code fait 6 chiffres.');
      return;
    }
    setOccupe(true);
    setErreur(null);
    const { error } = await client.auth.verifyOtp({ email, token: chiffres, type: 'email' });
    setOccupe(false);
    if (error) {
      // Message volontairement vague : on ne dit pas si c'est l'adresse ou le code qui coince.
      setErreur(
        error.status === 429
          ? 'Trop de tentatives. Réessaie dans quelques minutes.'
          : 'Ce code ne marche pas ou a expiré.',
      );
      return;
    }
    setCode('');
    setEtape('email');
  }

  return (
    <Cadre>
      <Text style={styles.texte}>
        Facultatif. Un compte servira à sauvegarder ta collection et à la retrouver sur un autre
        téléphone.
      </Text>

      {etape === 'email' ? (
        <>
          <TextInput
            style={styles.champ}
            value={email}
            onChangeText={setEmail}
            placeholder="ton@adresse.fr"
            placeholderTextColor={couleurs.encreDouce}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            maxLength={254}
            editable={!occupe}
          />
          <Bouton titre={occupe ? 'Envoi…' : 'Recevoir un code'} onPress={envoyerCode} />
        </>
      ) : (
        <>
          <Text style={styles.texte}>Code envoyé à {email}.</Text>
          <TextInput
            style={[styles.champ, styles.champCode]}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={couleurs.encreDouce}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={8}
            editable={!occupe}
          />
          <Bouton titre={occupe ? 'Vérification…' : 'Valider'} onPress={validerCode} />
          <View style={styles.ligne}>
            <Text
              style={styles.lien}
              onPress={() => {
                setEtape('email');
                setCode('');
                setErreur(null);
              }}>
              Changer d'adresse
            </Text>
            <Text
              style={[styles.lien, renvoiDans > 0 && styles.lienInactif]}
              onPress={renvoiDans > 0 || occupe ? undefined : envoyerCode}>
              {renvoiDans > 0 ? `Renvoyer (${renvoiDans} s)` : 'Renvoyer le code'}
            </Text>
          </View>
        </>
      )}

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
    </Cadre>
  );
}

function Cadre({ children }: { children: React.ReactNode }) {
  return <View style={styles.cadre}>{children}</View>;
}

const styles = StyleSheet.create({
  cadre: {
    gap: espace.m,
    padding: espace.m,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encre,
  },
  champ: {
    fontFamily: polices.moyen,
    fontSize: 17,
    color: couleurs.encre,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 12,
    paddingVertical: espace.s + 4,
    paddingHorizontal: espace.m,
  },
  champCode: {
    fontFamily: polices.extraGras,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lien: {
    fontFamily: polices.moyen,
    fontSize: 15,
    color: couleurs.encre,
    textDecorationLine: 'underline',
  },
  lienInactif: {
    color: couleurs.encreDouce,
    textDecorationLine: 'none',
  },
  erreur: {
    fontFamily: polices.moyen,
    fontSize: 15,
    color: couleurs.brique,
  },
});
