import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';

import { categories, type Categorie } from '@/cartes/categories';
import { useInclinaison } from '@/cartes/inclinaison';
import { numeroDe, type FormatTimbre, type Lieu } from '@/cartes/lieux';
import { defis } from '@/defis/defis';
import { couleurs, polices } from '@/theme';

type Props = {
  lieu: Lieu;
  taille: number; // côté de référence en points, voir dimensionsTimbre
  debloqueLe?: Date; // date de l'oblitération. Sans date, timbre neuf.
  onPress?: () => void; // un toucher appelle ceci (ouvrir en grand)
  retournable?: boolean; // sans onPress : un toucher retourne le timbre
  enGrand?: boolean; // reflet et léger pivot qui suivent l'inclinaison du téléphone
  obliterationAnimee?: boolean; // le tampon tombe sur le timbre peu après l'apparition
  onOblitere?: () => void; // au moment où le tampon touche le timbre
};

// Proportions de docs/LIEUX.md : portrait pour ce qui est haut, paysage pour ponts,
// places, parcs et gares, carré pour les petits lieux, grand pour quartiers et légendaires.
const PROPORTIONS: Record<FormatTimbre, { l: number; h: number }> = {
  portrait: { l: 0.78, h: 1 },
  paysage: { l: 1, h: 0.78 },
  carre: { l: 0.86, h: 0.86 },
  grand: { l: 1.3, h: 1 },
};

export function dimensionsTimbre(format: FormatTimbre, taille: number) {
  const p = PROPORTIONS[format];
  return { largeur: Math.round(p.l * taille), hauteur: Math.round(p.h * taille) };
}

// La plus grande taille qui fait tenir le timbre dans la place donnée.
export function tailleQuiTient(format: FormatTimbre, largeur: number, hauteur: number) {
  const p = PROPORTIONS[format];
  return Math.floor(Math.min(largeur / p.l, hauteur / p.h));
}

const DUREE_RETOURNEMENT = 520;
const SOULEVEMENT = 0.06;
const DELAI_OBLITERATION = 650;
const PIVOT_MAX = 12;
const PIVOT_GAIN = 2.5;

export function Timbre({
  lieu,
  taille,
  debloqueLe,
  onPress,
  retournable = false,
  enGrand = false,
  obliterationAnimee = false,
  onOblitere,
}: Props) {
  const { largeur, hauteur } = dimensionsTimbre(lieu.format, taille);
  const categorie = categories[lieu.categorie];
  const inclinaison = useInclinaison();
  const rotation = useSharedValue(0); // 0 : recto, 1 : verso
  const [auVerso, setAuVerso] = useState(false);

  function retourner() {
    rotation.value = withTiming(auVerso ? 0 : 1, {
      duration: DUREE_RETOURNEMENT,
      easing: Easing.inOut(Easing.cubic),
    });
    setAuVerso(!auVerso);
  }

  const styleRecto = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { scale: interpolate(rotation.value, [0, 0.5, 1], [1, 1 + SOULEVEMENT, 1]) },
      { rotateY: `${rotation.value * 180}deg` },
    ],
  }));
  const styleVerso = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { scale: interpolate(rotation.value, [0, 0.5, 1], [1, 1 + SOULEVEMENT, 1]) },
      { rotateY: `${180 + rotation.value * 180}deg` },
    ],
  }));
  const stylePivot = useAnimatedStyle(() => {
    if (!enGrand || !inclinaison) return { transform: [] };
    const y = Math.max(-1, Math.min(1, inclinaison.x.value * PIVOT_GAIN)) * PIVOT_MAX;
    const x = Math.max(-1, Math.min(1, inclinaison.y.value * PIVOT_GAIN)) * PIVOT_MAX;
    return {
      transform: [{ perspective: 800 }, { rotateY: `${y}deg` }, { rotateX: `${x}deg` }],
    };
  });

  const action = onPress ?? (retournable ? retourner : undefined);
  const recto = (
    <Recto
      lieu={lieu}
      largeur={largeur}
      hauteur={hauteur}
      categorie={categorie}
      reflet={enGrand}
      debloqueLe={debloqueLe}
      obliterationAnimee={obliterationAnimee}
      onOblitere={onOblitere}
    />
  );

  return (
    <Pressable
      onPress={action}
      disabled={!action}
      accessibilityRole={action ? 'button' : 'image'}
      accessibilityLabel={`${lieu.nom}, timbre ${formaterNumero(numeroDe(lieu))}`}
      accessibilityHint={onPress ? 'Ouvre le timbre en grand' : retournable ? 'Retourne le timbre' : undefined}
      style={{ width: largeur, height: hauteur }}>
      <Animated.View style={[StyleSheet.absoluteFill, stylePivot]}>
        {retournable ? (
          <>
            <Animated.View style={[styles.face, styleRecto]}>{recto}</Animated.View>
            <Animated.View style={[styles.face, styleVerso]}>
              <Verso
                lieu={lieu}
                largeur={largeur}
                hauteur={hauteur}
                categorie={categorie}
                debloqueLe={debloqueLe}
              />
            </Animated.View>
          </>
        ) : (
          recto
        )}
      </Animated.View>
    </Pressable>
  );
}

// Emplacement d'un timbre pas encore trouvé : cadre en pointillés à son format, avec son numéro.
export function TimbreCache({ lieu, taille }: { lieu: Lieu; taille: number }) {
  const { largeur, hauteur } = dimensionsTimbre(lieu.format, taille);
  const u = Math.min(largeur, hauteur) / 100;
  return (
    <View
      accessible
      accessibilityLabel={`Timbre ${numeroDe(lieu)}, pas encore trouvé`}
      style={[styles.cache, { width: largeur, height: hauteur, borderRadius: 3 * u }]}>
      <Text style={[styles.cacheNumero, { fontSize: Math.max(10, 13 * u) }]}>
        {String(numeroDe(lieu)).padStart(3, '0')}
      </Text>
      <View
        style={[
          styles.cachePoint,
          { backgroundColor: categories[lieu.categorie].bordure, width: 9 * u, height: 9 * u, borderRadius: 4.5 * u },
        ]}
      />
    </View>
  );
}

// Forme commune : papier blanc à bord dentelé, les trous laissent voir ce qu'il y a derrière.
function mesures(largeur: number, hauteur: number) {
  const petit = Math.min(largeur, hauteur);
  const pas = Math.max(6, Math.min(16, petit * 0.09)); // écart voulu entre deux trous
  const rayon = pas * 0.32;
  const nx = Math.max(3, Math.round(largeur / pas));
  const ny = Math.max(3, Math.round(hauteur / pas));
  const trous: [number, number][] = [];
  for (let i = 0; i < nx; i++) {
    const x = ((i + 0.5) * largeur) / nx;
    trous.push([x, 0], [x, hauteur]);
  }
  for (let j = 0; j < ny; j++) {
    const y = ((j + 0.5) * hauteur) / ny;
    trous.push([0, y], [largeur, y]);
  }
  return { u: petit / 100, rayon, trous, marge: rayon * 2.2 + petit * 0.02 };
}

// Une seule forme : le rectangle du papier, percé d'un cercle par trou. La règle « evenodd »
// fait des cercles des trous, sans masque (plus léger, et sûr dans une vue retournée en 3D).
function Papier({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  const { rayon, trous } = mesures(largeur, hauteur);
  const r = rayon;
  const cercles = trous
    .map(([x, y]) => `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`)
    .join(' ');
  const forme = `M 0 0 H ${largeur} V ${hauteur} H 0 Z ${cercles}`;
  return (
    <Svg width={largeur + 2} height={hauteur + 2} style={styles.papier}>
      {/* Ombre courte : la même forme, décalée d'un point, à peine teintée. */}
      <Path d={forme} fill={couleurs.encre} opacity={0.16} fillRule="evenodd" translateX={1} translateY={1.2} />
      <Path d={forme} fill={couleurs.papier} fillRule="evenodd" />
    </Svg>
  );
}

function Recto({
  lieu,
  largeur,
  hauteur,
  categorie,
  reflet,
  debloqueLe,
  obliterationAnimee,
  onOblitere,
}: {
  lieu: Lieu;
  largeur: number;
  hauteur: number;
  categorie: Categorie;
  reflet: boolean;
  debloqueLe?: Date;
  obliterationAnimee: boolean;
  onOblitere?: () => void;
}) {
  const { u, marge } = mesures(largeur, hauteur);
  const legendaire = lieu.categorie === 'legendaire';
  const largeurImage = largeur - marge * 2;
  const hauteurImage = hauteur - marge * 2;

  return (
    <View style={{ width: largeur, height: hauteur }}>
      <Papier largeur={largeur} hauteur={hauteur} />
      <View
        style={[
          styles.image,
          {
            left: marge,
            top: marge,
            width: largeurImage,
            height: hauteurImage,
            backgroundColor: categorie.bordure,
            borderColor: legendaire ? couleurs.or : couleurs.encre,
            borderWidth: Math.max(1, 1.2 * u),
          },
        ]}>
        <Illustration lieu={lieu} categorie={categorie} u={u} />
        <Text
          style={[
            styles.numeroRecto,
            { color: categorie.surBordure, fontSize: Math.max(7, 7 * u), right: 3 * u, bottom: 2 * u },
          ]}>
          {String(numeroDe(lieu)).padStart(3, '0')}
        </Text>
        {reflet && <Reflet largeur={largeurImage} hauteur={hauteurImage} />}
      </View>
      {debloqueLe && (
        <Obliteration
          largeur={largeur}
          hauteur={hauteur}
          date={debloqueLe}
          zone={lieu.zone}
          couleur={legendaire ? couleurs.or : couleurs.encre}
          animee={obliterationAnimee}
          onOblitere={onOblitere}
        />
      )}
    </View>
  );
}

// Emplacement de l'image. Pas encore de photos : un aplat de la couleur de la catégorie
// avec le nom en grand. Plus tard, ici : la photo du lieu passée au filtre maison
// (bichromie, trame, encres décalées), et le nom redevient petit.
function Illustration({ lieu, categorie, u }: { lieu: Lieu; categorie: Categorie; u: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.centre, { padding: 7 * u }]}>
      <Text
        style={[styles.nomRecto, { color: categorie.surBordure, fontSize: 17 * u, lineHeight: 18 * u }]}
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.5}>
        {lieu.nom.toUpperCase()}
      </Text>
    </View>
  );
}

// Reflet léger qui glisse sur l'image quand on incline le téléphone (timbre en grand seulement).
function Reflet({ largeur, hauteur }: { largeur: number; hauteur: number }) {
  const inclinaison = useInclinaison();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cote = Math.max(largeur, hauteur);
  const course = cote * 0.7;
  const style = useAnimatedStyle(() => {
    if (!inclinaison) return { transform: [] };
    return {
      transform: [
        { translateX: -inclinaison.x.value * course },
        { translateY: inclinaison.y.value * course },
      ],
    };
  });
  const grand = cote * 3;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: largeur / 2 - grand / 2, top: hauteur / 2 - grand / 2, width: grand, height: grand },
        style,
      ]}>
      <Svg width={grand} height={grand}>
        <Defs>
          <LinearGradient id={`reflet${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity={0.16} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.04} />
            <Stop offset="0.53" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={grand} height={grand} fill={`url(#reflet${id})`} />
      </Svg>
    </Animated.View>
  );
}

const MOIS = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];

// Tampon rond daté, posé de travers, avec ses lignes ondulées qui traversent le timbre.
function Obliteration({
  largeur,
  hauteur,
  date,
  zone,
  couleur,
  animee,
  onOblitere,
}: {
  largeur: number;
  hauteur: number;
  date: Date;
  zone: string;
  couleur: string;
  animee: boolean;
  onOblitere?: () => void;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pose = useSharedValue(animee ? 0 : 1);

  useEffect(() => {
    if (!animee) return;
    pose.value = withDelay(
      DELAI_OBLITERATION,
      withTiming(1, { duration: 170, easing: Easing.in(Easing.quad) }, (fini) => {
        if (fini && onOblitere) runOnJS(onOblitere)();
      }),
    );
    // Ne se joue qu'une fois, à l'apparition du timbre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: pose.value,
    transform: [{ scale: interpolate(pose.value, [0, 1], [1.6, 1]) }],
  }));

  const petit = Math.min(largeur, hauteur);
  const R = petit * 0.3;
  const cx = largeur - R * 1.05;
  const cy = R * 1.15;
  const epaisseur = Math.max(1, petit * 0.014);
  const police = R * 0.2;
  const haut = R * 0.7; // ligne de base du texte du haut, entre les deux anneaux
  const bas = R * 0.93; // ligne de base du texte du bas
  // Texte court : « Paris 6e (Croix-Rouge...) » devient « PARIS 6E ».
  const texteZone = zone.replace(/\s*\(.*$/, '').toUpperCase().slice(0, 18);

  // Trois lignes ondulées, du bord gauche jusqu'au tampon.
  const vagues = [-0.32, 0, 0.32].map((d) => {
    const y = cy + d * R;
    const onde = R * 0.45;
    const amplitude = R * 0.09;
    let x = -onde;
    let chemin = `M ${x} ${y} Q ${x + onde / 4} ${y - amplitude} ${x + onde / 2} ${y}`;
    x += onde / 2;
    while (x < cx - R * 1.08) {
      x += onde / 2;
      chemin += ` T ${x} ${y}`;
    }
    return chemin;
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={largeur} height={hauteur}>
        <Defs>
          <Path id={`haut${id}`} d={`M ${cx - haut} ${cy} A ${haut} ${haut} 0 0 1 ${cx + haut} ${cy}`} />
          <Path id={`bas${id}`} d={`M ${cx - bas} ${cy} A ${bas} ${bas} 0 0 0 ${cx + bas} ${cy}`} />
        </Defs>
        <G opacity={0.72} rotation={-12} origin={`${cx}, ${cy}`}>
          {vagues.map((d, i) => (
            <Path key={i} d={d} stroke={couleur} strokeWidth={epaisseur} fill="none" />
          ))}
          <Circle cx={cx} cy={cy} r={R} stroke={couleur} strokeWidth={epaisseur} fill="none" />
          <Circle cx={cx} cy={cy} r={R * 0.6} stroke={couleur} strokeWidth={epaisseur * 0.8} fill="none" />
          <SvgText fill={couleur} fontSize={police} fontFamily={polices.extraGras} letterSpacing={police * 0.08}>
            <TextPath href={`#haut${id}`} startOffset="50%" textAnchor="middle">
              {texteZone}
            </TextPath>
          </SvgText>
          <SvgText fill={couleur} fontSize={police} fontFamily={polices.extraGras} letterSpacing={police * 0.15}>
            <TextPath href={`#bas${id}`} startOffset="50%" textAnchor="middle">
              {String(date.getFullYear())}
            </TextPath>
          </SvgText>
          <SvgText
            x={cx}
            y={cy - R * 0.02}
            fill={couleur}
            fontSize={R * 0.3}
            fontFamily={polices.extraGras}
            textAnchor="middle">
            {date.getDate()}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + R * 0.3}
            fill={couleur}
            fontSize={R * 0.19}
            fontFamily={polices.gras}
            textAnchor="middle">
            {MOIS[date.getMonth()]}
          </SvgText>
        </G>
      </Svg>
    </Animated.View>
  );
}

function Verso({
  lieu,
  largeur,
  hauteur,
  categorie,
  debloqueLe,
}: {
  lieu: Lieu;
  largeur: number;
  hauteur: number;
  categorie: Categorie;
  debloqueLe?: Date;
}) {
  const { u, marge } = mesures(largeur, hauteur);
  const lies = defis.filter((d) => lieu.defis.includes(d.id)).map((d) => d.titre);
  const t = (n: number) => n * u; // tailles de texte proportionnelles au timbre

  return (
    <View style={{ width: largeur, height: hauteur }}>
      <Papier largeur={largeur} hauteur={hauteur} />
      <View
        style={[
          styles.dos,
          {
            left: marge,
            top: marge,
            width: largeur - marge * 2,
            height: hauteur - marge * 2,
            borderColor: categorie.bordure === couleurs.encre ? couleurs.or : categorie.bordure,
            borderWidth: Math.max(1.5, 1.6 * u),
            padding: 5 * u,
          },
        ]}>
        <View style={styles.ligne}>
          <Text style={[styles.numeroDos, { fontSize: t(5.5) }]}>{formaterNumero(numeroDe(lieu))}</Text>
          <Text style={[styles.categorie, { fontSize: t(4.4) }]} numberOfLines={1}>
            {categorie.nom.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.filet, { marginVertical: 2.5 * u }]} />
        <Text
          style={[styles.nomDos, { fontSize: t(9), lineHeight: t(10) }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}>
          {lieu.nom}
        </Text>
        <Text style={[styles.zone, { fontSize: t(4.8), marginTop: t(0.8) }]} numberOfLines={1}>
          {lieu.zone}
        </Text>
        {lieu.anecdote !== '' && (
          <Text
            style={[styles.anecdote, { fontSize: t(5), lineHeight: t(7), marginTop: t(3) }]}
            numberOfLines={Math.max(2, Math.floor((hauteur * 0.4) / t(7)))}>
            {lieu.anecdote}
          </Text>
        )}
        <View style={styles.bas}>
          {lies.length > 0 && (
            <Text style={[styles.defis, { fontSize: t(4.4), lineHeight: t(6) }]} numberOfLines={2}>
              {lies.length > 1 ? 'Défis' : 'Défi'} : {lies.join(', ')}
            </Text>
          )}
          <Text style={[styles.date, { fontSize: t(4.4) }]}>
            {debloqueLe ? `Découvert le ${formaterDate(debloqueLe)}` : 'Pas encore découvert'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const MOIS_LONGS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formaterNumero(n: number) {
  return `N° ${String(n).padStart(3, '0')}`;
}

function formaterDate(d: Date) {
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  papier: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  image: {
    position: 'absolute',
    overflow: 'hidden',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomRecto: {
    fontFamily: polices.extraGras,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  numeroRecto: {
    position: 'absolute',
    fontFamily: polices.gras,
    fontVariant: ['tabular-nums'],
  },
  dos: {
    position: 'absolute',
    backgroundColor: couleurs.fond,
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
    height: 1.5,
    backgroundColor: couleurs.encre,
  },
  nomDos: {
    fontFamily: polices.extraGras,
    color: couleurs.encre,
  },
  zone: {
    fontFamily: polices.moyen,
    color: couleurs.encreDouce,
  },
  anecdote: {
    fontFamily: polices.normal,
    color: couleurs.encre,
  },
  bas: {
    marginTop: 'auto',
    gap: 2,
  },
  defis: {
    fontFamily: polices.gras,
    color: couleurs.encre,
  },
  date: {
    fontFamily: polices.moyen,
    color: couleurs.encreDouce,
  },
  cache: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: couleurs.encreDouce,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cacheNumero: {
    fontFamily: polices.gras,
    color: couleurs.encreDouce,
    fontVariant: ['tabular-nums'],
  },
  cachePoint: {
    opacity: 0.7,
  },
});
