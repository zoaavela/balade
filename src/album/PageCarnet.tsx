import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Lieu } from '@/cartes/lieux';
import { Barre, IconeDefi } from '@/defis/elements';
import { avancement, recompense } from '@/defis/defis';
import { couleurs, espace, polices, trait } from '@/theme';
import { Timbre, TimbreCache } from '@/timbres/Timbre';

import type { Page } from './carnet';

type Props = {
  page: Page;
  complete: boolean;
  largeur: number; // largeur de la feuille
  debloquees: Map<string, Date>;
  totalPage: { fait: number; total: number }; // compte de la page entière, sans filtre
  onOuvrir: (lieu: Lieu) => void;
};

const ECART = 12;
const MARGE = 14; // intérieur de la feuille

// Une page du carnet : l'en-tête du défi, puis ses emplacements. Un timbre trouvé
// est oblitéré, un emplacement vide montre son numéro en pointillés.
// Page complète : bordure dorée doublée d'un filet d'encre.
export function PageCarnet({ page, complete, largeur, debloquees, totalPage, onOuvrir }: Props) {
  const interieur = largeur - MARGE * 2 - trait * 2;
  // Trois timbres paysage par ligne ; les portraits sont plus étroits, les grands plus larges.
  const taille = Math.floor((interieur - ECART * 2) / 3.05);
  const { defi } = page;
  const termine = totalPage.fait === totalPage.total;

  return (
    <ScrollView
      style={{ width: largeur }}
      contentContainerStyle={styles.defilement}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.feuille, complete && styles.feuilleComplete]}>
        <View style={styles.entete}>
          {defi && <IconeDefi defi={defi} fait={avancement(defi, debloquees)} taille={44} />}
          <View style={styles.enteteTexte}>
            <View style={styles.ligneTitre}>
              <Text style={styles.titre} numberOfLines={2}>
                {page.titre}
              </Text>
              <Text style={styles.chiffre}>
                {totalPage.fait} / {totalPage.total}
              </Text>
            </View>
            <Text style={styles.sous}>
              {complete ? 'Page complète' : defi ? (totalPage.fait === 0 ? defi.contenu : recompense(defi)) : 'Les lieux hors défi.'}
            </Text>
          </View>
        </View>
        {defi && (
          <Barre part={totalPage.fait / totalPage.total} couleur={termine ? couleurs.or : defi.couleur} />
        )}

        <Emplacements lieux={page.lieux} taille={taille} debloquees={debloquees} onOuvrir={onOuvrir} />

        {page.reveles.length > 0 && (
          <View style={styles.reveles}>
            <Text style={styles.etiquette}>
              {complete ? 'RÉVÉLÉS PAR CE DÉFI' : 'À RÉVÉLER EN FINISSANT CE DÉFI'}
            </Text>
            <Emplacements lieux={page.reveles} taille={taille} debloquees={debloquees} onOuvrir={onOuvrir} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Emplacements({
  lieux,
  taille,
  debloquees,
  onOuvrir,
}: {
  lieux: Lieu[];
  taille: number;
  debloquees: Map<string, Date>;
  onOuvrir: (lieu: Lieu) => void;
}) {
  return (
    <View style={styles.grille}>
      {lieux.map((lieu) => {
        const t = lieu.format === 'grand' ? taille * 0.95 : taille;
        const date = debloquees.get(lieu.id);
        return date ? (
          <Timbre key={lieu.id} lieu={lieu} taille={t} debloqueLe={date} onPress={() => onOuvrir(lieu)} />
        ) : (
          <TimbreCache key={lieu.id} lieu={lieu} taille={t} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  defilement: {
    paddingBottom: espace.xl,
  },
  feuille: {
    gap: espace.m,
    padding: MARGE,
    backgroundColor: couleurs.papier,
    borderWidth: trait,
    borderColor: couleurs.encre,
    borderRadius: 14,
  },
  // Sobre : la bordure passe à l'or, deux fois plus épaisse.
  feuilleComplete: {
    borderColor: couleurs.or,
    borderWidth: trait * 2,
    padding: MARGE - trait,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enteteTexte: {
    flex: 1,
    gap: 2,
  },
  ligneTitre: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: espace.s,
  },
  titre: {
    flexShrink: 1,
    fontFamily: polices.extraGras,
    fontSize: 20,
    lineHeight: 24,
    color: couleurs.encre,
  },
  chiffre: {
    fontFamily: polices.extraGras,
    fontSize: 18,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  sous: {
    fontFamily: polices.gras,
    fontSize: 13,
    color: couleurs.encre,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ECART,
    paddingVertical: espace.s,
  },
  reveles: {
    gap: espace.s,
    paddingTop: espace.m,
    borderTopWidth: 2,
    borderTopColor: couleurs.encre,
  },
  etiquette: {
    fontFamily: polices.gras,
    fontSize: 12,
    letterSpacing: 0.8,
    color: couleurs.encre,
  },
});
