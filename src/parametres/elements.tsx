import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconChevronRight from '@tabler/icons-react-native/IconChevronRight';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { couleurs, espace, polices, trait } from '@/theme';

// Briques des paramètres (T32) : même DA que le profil. Une liste par section, titre
// en capitales espacées, traits d'encre entre les lignes.

export function Feuille({
  titre,
  onRetour,
  libelleRetour = 'Retour',
  children,
}: {
  titre: string;
  onRetour: () => void;
  libelleRetour?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.feuille}>
      <Pressable onPress={onRetour} accessibilityRole="button" hitSlop={10} style={styles.retour}>
        <IconChevronLeft size={20} color={couleurs.encre} strokeWidth={2.5} />
        <Text style={styles.retourTexte}>{libelleRetour}</Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={styles.titre}>{titre}</Text>
        {children}
      </ScrollView>
    </View>
  );
}

// Un grand bouton de l'accueil des paramètres : le titre de la section, en gros.
export function GrandBouton({ titre, detail, onPress }: { titre: string; detail: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={detail}
      style={({ pressed }) => [styles.grandBouton, pressed && styles.appuye]}>
      <View style={styles.textes}>
        <Text style={styles.grandTitre}>{titre}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <IconChevronRight size={24} color={couleurs.encre} strokeWidth={2.5} />
    </Pressable>
  );
}

// Cadre brique, à part du reste, pour les actions qui effacent pour de bon.
export function ZoneDanger({ children }: { children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.titreSection, styles.danger]}>ZONE DE DANGER</Text>
      <View style={styles.zoneDanger}>
        {/* Le trait sous la dernière ligne passerait sur le cadre : on le cache. */}
        <View style={styles.zoneDangerInterieur}>{children}</View>
      </View>
    </View>
  );
}

export function Section({ titre, note, children }: { titre: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.titreSection}>{titre.toUpperCase()}</Text>
      <View style={styles.liste}>{children}</View>
      {note && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

export function Ligne({
  titre,
  detail,
  valeur,
  onPress,
  danger = false,
  occupe = false,
}: {
  titre: string;
  detail?: string;
  valeur?: string;
  onPress?: () => void;
  danger?: boolean;
  occupe?: boolean;
}) {
  return (
    <Pressable
      onPress={occupe ? undefined : onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [styles.ligne, pressed && styles.appuye]}>
      <View style={styles.textes}>
        <Text style={[styles.titreLigne, danger && styles.danger]}>{titre}</Text>
        {detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      {valeur && <Text style={styles.valeur}>{valeur}</Text>}
      {occupe ? (
        <ActivityIndicator color={couleurs.encre} />
      ) : (
        onPress && <IconChevronRight size={18} color={couleurs.encreDouce} strokeWidth={2.5} />
      )}
    </Pressable>
  );
}

export function LigneInterrupteur({
  titre,
  detail,
  valeur,
  onChange,
  desactive = false,
}: {
  titre: string;
  detail?: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
  desactive?: boolean;
}) {
  return (
    <View style={styles.ligne}>
      <View style={styles.textes}>
        <Text style={[styles.titreLigne, desactive && styles.estompe]}>{titre}</Text>
        {detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Switch
        value={valeur}
        onValueChange={onChange}
        disabled={desactive}
        trackColor={{ true: couleurs.encre, false: couleurs.encreDouce }}
        thumbColor={couleurs.papier}
        accessibilityLabel={titre}
      />
    </View>
  );
}

export const stylesParametres = StyleSheet.create({
  texte: {
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encre,
  },
  champ: {
    borderWidth: trait,
    borderColor: couleurs.encre,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: polices.moyen,
    fontSize: 17,
    color: couleurs.encre,
    backgroundColor: couleurs.papier,
  },
  erreur: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.brique,
  },
});

const styles = StyleSheet.create({
  feuille: {
    flex: 1,
    backgroundColor: couleurs.fond,
    paddingTop: espace.m,
  },
  retour: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: espace.m,
  },
  retourTexte: {
    fontFamily: polices.gras,
    fontSize: 17,
    color: couleurs.encre,
  },
  contenu: {
    padding: espace.m,
    paddingBottom: espace.xl * 2,
    gap: espace.l,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 34,
    color: couleurs.encre,
  },
  section: {
    gap: espace.s,
  },
  grandBouton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    padding: espace.m,
    borderWidth: trait,
    borderColor: couleurs.encre,
    borderRadius: 14,
    backgroundColor: couleurs.papier,
  },
  grandTitre: {
    fontFamily: polices.extraGras,
    fontSize: 24,
    color: couleurs.encre,
  },
  zoneDanger: {
    borderWidth: trait,
    borderColor: couleurs.brique,
    borderRadius: 14,
    paddingHorizontal: espace.m,
    overflow: 'hidden',
  },
  zoneDangerInterieur: {
    marginBottom: -2,
  },
  titreSection: {
    fontFamily: polices.gras,
    fontSize: 12,
    letterSpacing: 1.2,
    color: couleurs.encre,
  },
  liste: {
    borderTopWidth: 2,
    borderTopColor: couleurs.encre,
  },
  note: {
    fontFamily: polices.moyen,
    fontSize: 13,
    lineHeight: 18,
    color: couleurs.encreDouce,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    minHeight: 52,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: couleurs.encre,
  },
  appuye: {
    opacity: 0.6,
  },
  textes: {
    flex: 1,
    gap: 2,
  },
  titreLigne: {
    fontFamily: polices.gras,
    fontSize: 16,
    color: couleurs.encre,
  },
  estompe: {
    color: couleurs.encreDouce,
  },
  danger: {
    color: couleurs.brique,
  },
  detail: {
    fontFamily: polices.moyen,
    fontSize: 13,
    lineHeight: 17,
    color: couleurs.encreDouce,
  },
  valeur: {
    fontFamily: polices.moyen,
    fontSize: 15,
    color: couleurs.encre,
    maxWidth: '45%',
    textAlign: 'right',
  },
});
