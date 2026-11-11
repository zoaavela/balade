import { Image } from 'expo-image';
import { useId, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { couleurs, melanger, polices, trait } from '@/theme';

import { categories, type Categorie } from './categories';
import { illustrationDe } from './illustrations';
import { numeroDe, type Lieu } from './lieux';

type Props = {
  lieu: Lieu;
  taille: number; // côté du carré, en points
  debloqueLe?: Date; // date du tampon « Validé ». Sans date, pas de tampon.
};

const COUCHES_TRANCHE = 4; // épaisseur du carton, 1 point par couche

export function Carte({ lieu, taille, debloqueLe }: Props) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [auDos, setAuDos] = useState(false);
  const categorie = categories[lieu.categorie];

  function retourner() {
    Animated.spring(rotation, {
      toValue: auDos ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setAuDos(!auDos);
  }

  const angleFace = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const angleDos = rotation.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const cote = taille + COUCHES_TRANCHE;

  return (
    <Pressable
      onPress={retourner}
      accessibilityRole="button"
      accessibilityLabel={lieu.nom}
      accessibilityHint="Retourne la carte"
      style={{ width: cote, height: cote }}>
      <Animated.View
        style={[styles.face, { transform: [{ perspective: 1000 }, { rotateY: angleFace }] }]}>
        <Carton taille={taille} categorie={categorie}>
          <Face lieu={lieu} taille={taille} categorie={categorie} />
        </Carton>
      </Animated.View>
      <Animated.View
        style={[styles.face, { transform: [{ perspective: 1000 }, { rotateY: angleDos }] }]}>
        <Carton taille={taille} categorie={categorie}>
          <Dos lieu={lieu} taille={taille} categorie={categorie} debloqueLe={debloqueLe} />
        </Carton>
      </Animated.View>
    </Pressable>
  );
}

// Mesures communes, proportionnelles à la taille de la carte.
function mesures(taille: number) {
  const u = taille / 100;
  const rayon = 7 * u;
  const bord = 6 * u;
  return { u, rayon, bord, rayonInterieur: Math.max(rayon - bord * 0.6, 3 * u) };
}

// Le support physique : tranche, ombre courte, bordure de couleur, vernis et grain.
function Carton({
  taille,
  categorie,
  children,
}: {
  taille: number;
  categorie: Categorie;
  children: ReactNode;
}) {
  const { rayon, bord } = mesures(taille);
  const couches = Array.from({ length: COUCHES_TRANCHE }, (_, i) => COUCHES_TRANCHE - i);

  return (
    <View style={{ width: taille + COUCHES_TRANCHE, height: taille + COUCHES_TRANCHE }}>
      {couches.map((decalage) => (
        <View
          key={decalage}
          style={[
            styles.couche,
            {
              width: taille,
              height: taille,
              left: decalage,
              top: decalage,
              borderRadius: rayon,
              // Plus la couche est profonde, plus elle est sombre.
              backgroundColor: melanger(categorie.tranche, couleurs.encre, 0.15 + decalage * 0.1),
            },
            decalage === COUCHES_TRANCHE && styles.ombre,
          ]}
        />
      ))}
      <View
        style={[
          styles.couche,
          {
            width: taille,
            height: taille,
            borderRadius: rayon,
            backgroundColor: categorie.bordure,
            padding: bord,
            overflow: 'hidden',
          },
        ]}>
        {children}
        <Vernis taille={taille} />
      </View>
    </View>
  );
}

// Reflet brillant en diagonale et grain très fin de carton glacé.
// Pour l'instant fixe. Plus tard il suivra l'inclinaison du téléphone.
function Vernis({ taille }: { taille: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={taille} height={taille} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`reflet${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.34" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.44" stopColor="#FFFFFF" stopOpacity={0.22} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.06} />
          <Stop offset="0.58" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <Pattern id={`grain${id}`} width={5} height={5} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={1} height={1} fill={couleurs.encre} opacity={0.06} />
          <Rect x={3} y={1} width={1} height={1} fill="#FFFFFF" opacity={0.08} />
          <Rect x={1} y={3} width={1} height={1} fill="#FFFFFF" opacity={0.06} />
          <Rect x={4} y={4} width={1} height={1} fill={couleurs.encre} opacity={0.05} />
        </Pattern>
      </Defs>
      <Rect width={taille} height={taille} fill={`url(#grain${id})`} />
      <Rect width={taille} height={taille} fill={`url(#reflet${id})`} />
    </Svg>
  );
}

function Face({ lieu, taille, categorie }: { lieu: Lieu; taille: number; categorie: Categorie }) {
  const { u, rayonInterieur } = mesures(taille);
  const illustration = illustrationDe(lieu.id);

  return (
    <View
      style={[
        styles.cadre,
        { borderRadius: rayonInterieur, borderColor: categorie.lisere },
      ]}>
      {illustration !== undefined ? (
        <Image source={illustration} style={StyleSheet.absoluteFill} contentFit="contain" />
      ) : (
        <Remplacement taille={taille} categorie={categorie} />
      )}
      <Text
        style={[styles.titre, { fontSize: 7 * u, marginTop: 4 * u, marginHorizontal: 5 * u }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {lieu.nom.toUpperCase()}
      </Text>
      <Text style={[styles.numeroFace, { fontSize: 4 * u, right: 3.5 * u, bottom: 2.5 * u }]}>
        {formaterNumero(numeroDe(lieu))}
      </Text>
    </View>
  );
}

// Illustration neutre en attendant la vraie : un disque teinté de la couleur
// de la catégorie et une ligne de sol.
function Remplacement({ taille, categorie }: { taille: number; categorie: Categorie }) {
  const { u } = mesures(taille);
  const diametre = 42 * u;
  return (
    <View style={[StyleSheet.absoluteFill, styles.centre]}>
      <View
        style={{
          width: diametre,
          height: diametre,
          borderRadius: diametre / 2,
          backgroundColor: melanger(couleurs.fond, categorie.tranche, 0.3),
          marginTop: 8 * u,
        }}
      />
      <View
        style={{
          width: 56 * u,
          height: trait,
          backgroundColor: couleurs.encreDouce,
          marginTop: -diametre * 0.28,
        }}
      />
    </View>
  );
}

function Dos({
  lieu,
  taille,
  categorie,
  debloqueLe,
}: {
  lieu: Lieu;
  taille: number;
  categorie: Categorie;
  debloqueLe?: Date;
}) {
  const { u, rayonInterieur } = mesures(taille);

  return (
    <View
      style={[
        styles.cadre,
        {
          borderRadius: rayonInterieur,
          borderColor: categorie.lisere,
          padding: 5 * u,
        },
      ]}>
      <View style={styles.ligne}>
        <Text style={[styles.numeroDos, { fontSize: 4.5 * u }]}>
          {formaterNumero(numeroDe(lieu))}
        </Text>
        <Text style={[styles.categorie, { fontSize: 3.8 * u }]} numberOfLines={1}>
          {categorie.nom.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.filet, { marginVertical: 3 * u }]} />
      <Text
        style={[styles.nom, { fontSize: 8.5 * u, lineHeight: 9.5 * u }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {lieu.nom}
      </Text>
      <Text
        style={[styles.anecdote, { fontSize: 4.6 * u, lineHeight: 6.4 * u, marginTop: 2.5 * u }]}
        numberOfLines={5}>
        {lieu.anecdote}
      </Text>
      <View style={styles.bas}>
        <Text style={[styles.adresse, { fontSize: 3.8 * u, lineHeight: 5 * u }]} numberOfLines={2}>
          {lieu.adresse}
        </Text>
        {debloqueLe && <Tampon taille={taille} couleur={categorie.tampon} date={debloqueLe} />}
      </View>
    </View>
  );
}

function Tampon({ taille, couleur, date }: { taille: number; couleur: string; date: Date }) {
  const { u } = mesures(taille);
  return (
    <View
      style={[
        styles.tampon,
        {
          borderColor: couleur,
          borderRadius: 2 * u,
          paddingHorizontal: 2.5 * u,
          paddingVertical: 1.2 * u,
        },
      ]}>
      <Text style={[styles.tamponTitre, { color: couleur, fontSize: 5 * u }]}>VALIDÉ</Text>
      <Text style={[styles.tamponDate, { color: couleur, fontSize: 3.4 * u }]}>
        {formaterDate(date)}
      </Text>
    </View>
  );
}

function formaterNumero(n: number) {
  return `N° ${String(n).padStart(3, '0')}`;
}

function formaterDate(d: Date) {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${deux(d.getDate())}.${deux(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  couche: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  ombre: {
    shadowColor: couleurs.encre,
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 2 },
  },
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fond,
    borderWidth: trait,
    overflow: 'hidden',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: {
    fontFamily: polices.extraGras,
    color: couleurs.encre,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  numeroFace: {
    position: 'absolute',
    fontFamily: polices.gras,
    color: couleurs.encre,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  numeroDos: {
    fontFamily: polices.extraGras,
    color: couleurs.encre,
  },
  categorie: {
    flexShrink: 1,
    fontFamily: polices.moyen,
    color: couleurs.encreDouce,
    letterSpacing: 0.5,
  },
  filet: {
    height: trait,
    backgroundColor: couleurs.encre,
  },
  nom: {
    fontFamily: polices.extraGras,
    color: couleurs.encre,
  },
  anecdote: {
    fontFamily: polices.normal,
    color: couleurs.encre,
  },
  bas: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  adresse: {
    flex: 1,
    fontFamily: polices.moyen,
    color: couleurs.encreDouce,
  },
  tampon: {
    borderWidth: trait,
    alignItems: 'center',
    transform: [{ rotate: '-8deg' }],
    opacity: 0.85,
  },
  tamponTitre: {
    fontFamily: polices.extraGras,
    letterSpacing: 1,
  },
  tamponDate: {
    fontFamily: polices.moyen,
  },
});
