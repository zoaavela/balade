import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ecran } from '@/components/ecran';
import { useDeblocage } from '@/deblocage/Deblocage';
import { Barre, IconeDefi } from '@/defis/elements';
import { avancement, defis, estTermine, recompense, type Defi } from '@/defis/defis';
import { couleurs, espace, polices } from '@/theme';

// Onglet Défis (T27), d'après docs/maquettes/profil-defis.html : une ligne par défi
// avec son icône, son avancement et sa barre. Toucher un défi ouvre sa page du carnet.
export default function Defis() {
  const { debloquees } = useDeblocage();

  // Terminés d'abord, puis les plus avancés.
  const tries = useMemo(() => {
    const part = (d: Defi) => avancement(d, debloquees) / d.lieux.length;
    return [...defis].sort((a, b) => part(b) - part(a));
  }, [debloquees]);
  const nbTermines = defis.filter((d) => estTermine(d, debloquees)).length;

  return (
    <Ecran titre="Défis">
      <Text style={styles.compteur}>
        {nbTermines} {nbTermines > 1 ? 'terminés' : 'terminé'} sur {defis.length}
      </Text>
      <ScrollView contentContainerStyle={styles.liste} showsVerticalScrollIndicator={false}>
        {tries.map((d) => (
          <LigneDefi key={d.id} defi={d} fait={avancement(d, debloquees)} onPress={() => ouvrirPage(d)} />
        ))}
      </ScrollView>
    </Ecran>
  );
}

// Ouvre l'album à la page du défi. t change à chaque toucher, pour rouvrir la même page.
function ouvrirPage(d: Defi) {
  router.navigate({ pathname: '/album', params: { page: d.id, t: String(Date.now()) } });
}

function LigneDefi({ defi, fait, onPress }: { defi: Defi; fait: number; onPress: () => void }) {
  const total = defi.lieux.length;
  const termine = fait === total;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${defi.titre}, ${fait} sur ${total}`}
      style={styles.ligne}>
      <IconeDefi defi={defi} fait={fait} taille={46} />
      <View style={styles.milieu}>
        <View style={styles.entete}>
          <Text style={styles.titre} numberOfLines={1}>
            {defi.titre}
          </Text>
          <Text style={styles.chiffre}>
            {fait} / {total}
          </Text>
        </View>
        <Text style={styles.sous}>{etat(defi, fait)}</Text>
        <Barre part={fait / total} couleur={termine ? couleurs.or : defi.couleur} />
      </View>
    </Pressable>
  );
}

function etat(d: Defi, fait: number): string {
  if (fait === d.lieux.length) {
    if (d.revele.length === 1) return 'Terminé. 1 lieu secret révélé';
    if (d.revele.length > 1) return `Terminé. ${d.revele.length} lieux secrets révélés`;
    if (d.timbreSpecial) return 'Terminé. Timbre spécial gagné';
    return 'Terminé';
  }
  if (fait === 0) return 'Pas encore commencé';
  return recompense(d);
}

const styles = StyleSheet.create({
  compteur: {
    fontFamily: polices.gras,
    fontSize: 15,
    color: couleurs.encre,
    marginTop: espace.xs,
    marginBottom: espace.m,
  },
  liste: {
    paddingBottom: espace.xl,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: couleurs.encre,
  },
  milieu: {
    flex: 1,
  },
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espace.s,
  },
  titre: {
    flexShrink: 1,
    fontFamily: polices.extraGras,
    fontSize: 16,
    color: couleurs.encre,
  },
  chiffre: {
    fontFamily: polices.extraGras,
    fontSize: 16,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  sous: {
    fontFamily: polices.gras,
    fontSize: 12,
    color: couleurs.encre,
    marginTop: 2,
    marginBottom: 6,
  },
});
