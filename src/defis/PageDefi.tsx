import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categories } from '@/cartes/categories';
import { numeroDe, type Lieu } from '@/cartes/lieux';
import { useDeblocage } from '@/deblocage/Deblocage';
import { couleurs, espace, polices, trait } from '@/theme';

import { avancement, estTermine, lieuxDuDefi, recompense, type Defi } from './defis';
import { Barre, IconeDefi } from './elements';

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// La page d'un défi. Provisoire : au T25, elle deviendra sa page du carnet de timbres.
// Un lieu pas encore trouvé ne montre que son numéro, plus sa devinette si c'est un indice :
// le nom d'un lieu à chercher ne doit pas apparaître ici.
export function PageDefi({ defi, onRetour }: { defi: Defi; onRetour: () => void }) {
  const marges = useSafeAreaInsets();
  const { debloquees } = useDeblocage();
  const fait = avancement(defi, debloquees);
  const total = defi.lieux.length;
  const termine = estTermine(defi, debloquees);

  return (
    <View style={[styles.ecran, { paddingTop: marges.top + espace.m }]}>
      <Pressable onPress={onRetour} accessibilityRole="button" hitSlop={10} style={styles.retour}>
        <Text style={styles.retourTexte}>‹ Défis</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <View style={styles.entete}>
          <IconeDefi defi={defi} fait={fait} taille={64} />
          <View style={styles.enteteTexte}>
            <Text style={styles.titre}>{defi.titre}</Text>
            <Text style={styles.texte}>{defi.contenu}</Text>
          </View>
        </View>

        <View style={styles.avancement}>
          <View style={styles.ligneChiffre}>
            <Text style={styles.chiffre}>
              {fait} / {total}
            </Text>
            <Text style={styles.recompense}>{termine ? 'Terminé' : recompense(defi)}</Text>
          </View>
          <Barre part={fait / total} couleur={termine ? couleurs.or : defi.couleur} />
        </View>

        {lieuxDuDefi(defi).map((lieu) => (
          <Emplacement key={lieu.id} lieu={lieu} trouveLe={debloquees.get(lieu.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Emplacement({ lieu, trouveLe }: { lieu: Lieu; trouveLe?: Date }) {
  const numero = `N° ${String(numeroDe(lieu)).padStart(3, '0')}`;
  const couleur = categories[lieu.categorie].bordure;
  const nomVisible = trouveLe || lieu.rarete === 'visible' || lieu.rarete === 'legendaire';
  return (
    <View style={[styles.case, trouveLe ? { borderColor: couleur } : styles.caseVide]}>
      <Text style={styles.numero}>{numero}</Text>
      <View style={styles.caseTexte}>
        <Text style={styles.nom}>{nomVisible ? lieu.nom : 'Lieu à trouver'}</Text>
        {trouveLe ? (
          <Text style={styles.detail}>
            Trouvé le {trouveLe.getDate()} {MOIS[trouveLe.getMonth()]}
          </Text>
        ) : (
          !nomVisible && lieu.indice !== '' && <Text style={styles.detail}>{lieu.indice}</Text>
        )}
      </View>
      {trouveLe && <View style={[styles.pastille, { backgroundColor: couleur }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
    paddingHorizontal: espace.m,
  },
  retour: {
    alignSelf: 'flex-start',
    marginBottom: espace.s,
  },
  retourTexte: {
    fontFamily: polices.gras,
    fontSize: 17,
    color: couleurs.encre,
  },
  contenu: {
    gap: espace.s,
    paddingBottom: espace.xl,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  enteteTexte: {
    flex: 1,
    gap: 2,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 26,
    lineHeight: 30,
    color: couleurs.encre,
  },
  texte: {
    fontFamily: polices.moyen,
    fontSize: 15,
    color: couleurs.encre,
  },
  avancement: {
    gap: 6,
    marginTop: espace.m,
    marginBottom: espace.s,
  },
  ligneChiffre: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  chiffre: {
    fontFamily: polices.extraGras,
    fontSize: 22,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  recompense: {
    fontFamily: polices.gras,
    fontSize: 13,
    color: couleurs.encre,
  },
  case: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: trait,
    borderRadius: 12,
    backgroundColor: couleurs.papier,
  },
  // Emplacement vide : pointillés, comme une case de carnet qui attend son timbre.
  caseVide: {
    borderStyle: 'dashed',
    borderColor: couleurs.encreDouce,
    backgroundColor: 'transparent',
  },
  numero: {
    width: 52,
    fontFamily: polices.gras,
    fontSize: 13,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  caseTexte: {
    flex: 1,
    gap: 2,
  },
  nom: {
    fontFamily: polices.extraGras,
    fontSize: 16,
    color: couleurs.encre,
  },
  detail: {
    fontFamily: polices.moyen,
    fontSize: 13,
    lineHeight: 17,
    color: couleurs.encre,
  },
  pastille: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: couleurs.encre,
  },
});
