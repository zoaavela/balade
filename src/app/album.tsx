import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { categories, type CategorieId } from '@/cartes/categories';
import { lieux, type Lieu } from '@/cartes/lieux';
import { Ecran } from '@/components/ecran';
import { useDeblocage } from '@/deblocage/Deblocage';
import { Timbre, TimbreCache } from '@/timbres/Timbre';
import { TimbreEnGrand } from '@/timbres/TimbreEnGrand';
import { couleurs, espace, polices, trait } from '@/theme';

const COLONNES = 3;
const ECART = 10; // espace entre deux cases de la grille

// Seules les catégories qui ont au moins un lieu apparaissent dans le filtre.
const categoriesPresentes = (Object.keys(categories) as CategorieId[]).filter((id) =>
  lieux.some((lieu) => lieu.categorie === id),
);

export default function Album() {
  const { width } = useWindowDimensions();
  const { debloquees } = useDeblocage();
  const [filtre, setFiltre] = useState<CategorieId | null>(null);
  const [enGrand, setEnGrand] = useState<Lieu | null>(null);

  // Le numéro d'un timbre est sa place dans la liste : l'ordre est déjà le bon.
  const affiches = filtre ? lieux.filter((lieu) => lieu.categorie === filtre) : lieux;
  const nbDebloques = affiches.filter((lieu) => debloquees.has(lieu.id)).length;
  // Grille provisoire en attendant le carnet du T25 : une case carrée par timbre,
  // le timbre centré dedans à son format.
  const cote = Math.floor((width - espace.m * 2 - ECART * (COLONNES - 1)) / COLONNES);

  return (
    <Ecran titre="Album">
      <Text style={styles.compteur}>
        {nbDebloques} / {affiches.length}
      </Text>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtres}>
          <Pastille titre="Toutes" actif={filtre === null} onPress={() => setFiltre(null)} />
          {categoriesPresentes.map((id) => (
            <Pastille
              key={id}
              titre={categories[id].nom}
              couleur={categories[id].bordure}
              actif={filtre === id}
              onPress={() => setFiltre(id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.grille} showsVerticalScrollIndicator={false}>
        {affiches.map((lieu) => {
          const taille = lieu.format === 'grand' ? cote / 1.3 : cote * 0.96;
          return (
            <View key={lieu.id} style={[styles.case, { width: cote, height: cote }]}>
              {debloquees.has(lieu.id) ? (
                <Timbre
                  lieu={lieu}
                  taille={taille}
                  debloqueLe={debloquees.get(lieu.id)}
                  onPress={() => setEnGrand(lieu)}
                />
              ) : (
                <TimbreCache lieu={lieu} taille={taille} />
              )}
            </View>
          );
        })}
      </ScrollView>

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
  case: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ECART,
    paddingBottom: espace.xl,
  },
});
