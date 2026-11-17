import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { pageComplete, pagesDuCarnet, type Page } from '@/album/carnet';
import { PageCarnet } from '@/album/PageCarnet';
import { categories, type CategorieId } from '@/cartes/categories';
import { lieux, type Lieu } from '@/cartes/lieux';
import { Ecran } from '@/components/ecran';
import { useDeblocage } from '@/deblocage/Deblocage';
import { avancement } from '@/defis/defis';
import { couleurs, espace, polices, trait } from '@/theme';
import { TimbreEnGrand } from '@/timbres/TimbreEnGrand';

// Seules les catégories qui ont au moins un lieu apparaissent dans le filtre.
const categoriesPresentes = (Object.keys(categories) as CategorieId[]).filter((id) =>
  lieux.some((lieu) => lieu.categorie === id),
);
const pagesSansFiltre = pagesDuCarnet(null);

// L'album en carnet de timbres (T25) : on tourne les pages en glissant le doigt.
// Ouvert depuis l'onglet Défis avec ?page=<id du défi>, il va directement à cette page.
export default function Album() {
  const { width } = useWindowDimensions();
  const { debloquees } = useDeblocage();
  const params = useLocalSearchParams<{ page?: string; t?: string }>();
  const [filtre, setFiltre] = useState<CategorieId | null>(null);
  const [index, setIndex] = useState(0);
  const [enGrand, setEnGrand] = useState<Lieu | null>(null);
  const refListe = useRef<FlatList<Page>>(null);

  const pages = useMemo(() => pagesDuCarnet(filtre), [filtre]);
  const affiches = filtre ? lieux.filter((l) => l.categorie === filtre) : lieux;
  const nbTrouves = affiches.filter((l) => debloquees.has(l.id)).length;
  const largeurPage = width - espace.m * 2;

  function allerA(i: number, anime = true) {
    const borne = Math.max(0, Math.min(pages.length - 1, i));
    setIndex(borne);
    refListe.current?.scrollToOffset({ offset: borne * width, animated: anime });
  }

  // Venue de l'onglet Défis : on retire le filtre si la page demandée serait masquée.
  // Le paramètre t change à chaque toucher, pour rouvrir la même page plusieurs fois.
  useEffect(() => {
    if (!params.page) return;
    const cible = pagesSansFiltre.findIndex((p) => p.id === params.page);
    if (cible < 0) return;
    setFiltre(null);
    // Après le rendu sans filtre, pour viser la bonne liste de pages.
    requestAnimationFrame(() => {
      setIndex(cible);
      refListe.current?.scrollToOffset({ offset: cible * width, animated: false });
    });
  }, [params.page, params.t, width]);

  // Changer de filtre : on reste sur la même page si elle existe encore.
  function choisirFiltre(nouveau: CategorieId | null) {
    const courante = pages[index]?.id;
    const suivantes = pagesDuCarnet(nouveau);
    const i = Math.max(0, suivantes.findIndex((p) => p.id === courante));
    setFiltre(nouveau);
    requestAnimationFrame(() => {
      setIndex(i);
      refListe.current?.scrollToOffset({ offset: i * width, animated: false });
    });
  }

  function finDeGlisse(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <Ecran titre="Album">
      <Text style={styles.compteur}>
        {nbTrouves} / {affiches.length} timbres
      </Text>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtres}>
          <Pastille titre="Tous" actif={filtre === null} onPress={() => choisirFiltre(null)} />
          {categoriesPresentes.map((id) => (
            <Pastille
              key={id}
              titre={categories[id].nom}
              couleur={categories[id].bordure}
              actif={filtre === id}
              onPress={() => choisirFiltre(id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.navigation}>
        <Fleche sens="‹" actif={index > 0} onPress={() => allerA(index - 1)} libelle="Page précédente" />
        <Text style={styles.numeroPage}>
          Page {Math.min(index + 1, pages.length)} sur {pages.length}
        </Text>
        <Fleche
          sens="›"
          actif={index < pages.length - 1}
          onPress={() => allerA(index + 1)}
          libelle="Page suivante"
        />
      </View>

      <FlatList
        ref={refListe}
        style={styles.pages}
        data={pages}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={finDeGlisse}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={2}
        windowSize={3}
        extraData={debloquees}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: espace.m }}>
            <PageCarnet
              page={item}
              largeur={largeurPage}
              complete={pageComplete(item.id, debloquees)}
              debloquees={debloquees}
              totalPage={totalDe(item.id, debloquees)}
              onOuvrir={setEnGrand}
            />
          </View>
        )}
      />

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

// Le compte d'une page entière, sans filtre, comme dans l'onglet Défis.
function totalDe(id: string, debloquees: Map<string, Date>) {
  const page = pagesSansFiltre.find((p) => p.id === id)!;
  if (page.defi) return { fait: avancement(page.defi, debloquees), total: page.lieux.length };
  return { fait: page.lieux.filter((l) => debloquees.has(l.id)).length, total: page.lieux.length };
}

function Fleche(props: { sens: string; actif: boolean; onPress: () => void; libelle: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={!props.actif}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={props.libelle}
      style={[styles.fleche, !props.actif && styles.flecheInactive]}>
      <Text style={styles.flecheTexte}>{props.sens}</Text>
    </Pressable>
  );
}

// Bouton du filtre : contour d'encre, rempli d'encre quand il est choisi.
function Pastille(props: { titre: string; couleur?: string; actif: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: props.actif }}
      style={[styles.pastille, props.actif && styles.pastilleActive]}>
      {props.couleur && <View style={[styles.point, { backgroundColor: props.couleur }]} />}
      <Text style={[styles.pastilleTexte, props.actif && styles.pastilleTexteActif]}>
        {props.titre}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compteur: {
    fontFamily: polices.gras,
    fontSize: 17,
    color: couleurs.encreDouce,
    fontVariant: ['tabular-nums'],
    marginTop: espace.xs,
  },
  filtres: {
    gap: espace.s,
    paddingVertical: espace.m,
  },
  pastille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: trait,
    borderColor: couleurs.encre,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: couleurs.fond,
  },
  pastilleActive: {
    backgroundColor: couleurs.encre,
  },
  point: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pastilleTexte: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.encre,
  },
  pastilleTexteActif: {
    color: couleurs.fond,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace.s,
  },
  numeroPage: {
    fontFamily: polices.gras,
    fontSize: 14,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  fleche: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: trait,
    borderColor: couleurs.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flecheInactive: {
    opacity: 0.25,
  },
  flecheTexte: {
    fontFamily: polices.extraGras,
    fontSize: 22,
    lineHeight: 24,
    color: couleurs.encre,
  },
  // La liste des pages déborde des marges de l'écran pour glisser bord à bord.
  pages: {
    flex: 1,
    marginHorizontal: -espace.m,
  },
});
