import Constants from 'expo-constants';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { dansExpoGo } from '@/suivi/environnement';
import { couleurs, espace, polices, trait } from '@/theme';

import { Feuille, Ligne, LigneInterrupteur, Section, stylesParametres as s } from './elements';
import { changerOption, useOptions, useReductionSysteme } from './options';

// Pages de la partie 2 des paramètres (T32) : suivi, notifications, affichage, aide.

const ADRESSE_BUG = 'balade.paris.dev@gmail.com';
const version = Constants.expoConfig?.version ?? '?';

export function PageSuivi({ onRetour }: { onRetour: () => void }) {
  const o = useOptions();
  return (
    <Feuille titre="Suivi et batterie" onRetour={onRetour} libelleRetour="Paramètres">
      <Section
        titre="Suivi"
        note={
          dansExpoGo
            ? "Dans Expo Go, l'app ne suit tes trajets que quand elle est ouverte : le suivi en arrière-plan prendra effet avec la vraie app."
            : undefined
        }>
        <LigneInterrupteur
          titre="Suivi en arrière-plan"
          detail="Enregistre tes trajets téléphone en poche. Coupé, seulement quand l'app est ouverte."
          valeur={o.suivi_fond}
          onChange={(v) => changerOption('suivi_fond', v)}
        />
        <LigneInterrupteur
          titre="Mode économie"
          detail="Une position tous les 30 m au lieu de 15. Le tracé est un peu moins fin."
          valeur={o.economie}
          onChange={(v) => changerOption('economie', v)}
        />
      </Section>
      <Section titre="Sauvegarde">
        <LigneInterrupteur
          titre="Synchroniser seulement en Wi-Fi"
          detail="Ta collection attend le Wi-Fi pour partir sur ton compte."
          valeur={o.synchro_wifi}
          onChange={(v) => changerOption('synchro_wifi', v)}
        />
      </Section>
    </Feuille>
  );
}

export function PageNotifications({ onRetour }: { onRetour: () => void }) {
  const o = useOptions();
  return (
    <Feuille titre="Notifications" onRetour={onRetour} libelleRetour="Paramètres">
      <Section
        titre="Me prévenir"
        note="Les notifications des défis et des amis arriveront avec ces fonctions. Pour toutes les couper, passe par les réglages de l'iPhone.">
        <LigneInterrupteur
          titre="Nouveau timbre"
          detail="Quand tu trouves un lieu, l'app fermée."
          valeur={o.notif_nouveau_timbre}
          onChange={(v) => changerOption('notif_nouveau_timbre', v)}
        />
      </Section>
      <Ligne titre="Réglages de l'iPhone" onPress={() => Linking.openSettings()} />
    </Feuille>
  );
}

export function PageAffichage({ onRetour }: { onRetour: () => void }) {
  const o = useOptions();
  const imposee = useReductionSysteme();
  return (
    <Feuille titre="Affichage" onRetour={onRetour} libelleRetour="Paramètres">
      <Section titre="Effets">
        <LigneInterrupteur
          titre="Vibrations"
          detail="Nouveau timbre, défi terminé, lieu secret tout proche."
          valeur={o.vibrations}
          onChange={(v) => changerOption('vibrations', v)}
        />
        <LigneInterrupteur
          titre="Reflet des timbres"
          detail="Le reflet qui bouge quand tu inclines le téléphone."
          valeur={o.reflet}
          onChange={(v) => changerOption('reflet', v)}
          desactive={imposee || o.animations_reduites}
        />
        <LigneInterrupteur
          titre="Réduire les animations"
          detail={
            imposee
              ? "Activé par le réglage « Réduire les animations » de l'iPhone."
              : 'Timbres sans effet de loupe, de pivot ni de tampon qui tombe.'
          }
          valeur={imposee || o.animations_reduites}
          onChange={(v) => changerOption('animations_reduites', v)}
          desactive={imposee}
        />
      </Section>
    </Feuille>
  );
}

export type PageTexte = 'confidentialite' | 'conditions' | 'mentions' | 'credits';

export function PageAide({ onRetour, ouvrir }: { onRetour: () => void; ouvrir: (p: PageTexte) => void }) {
  async function signaler() {
    const sujet = encodeURIComponent(`Bug Balade ${version}`);
    const corps = encodeURIComponent(
      `Ce qui s'est passé :\n\n\nCe que j'attendais :\n\n\n---\nVersion ${version}, ${Platform.OS} ${Platform.Version}`,
    );
    const lien = `mailto:${ADRESSE_BUG}?subject=${sujet}&body=${corps}`;
    try {
      await Linking.openURL(lien);
    } catch {
      Alert.alert('Pas d’app e-mail', `Écris-nous à ${ADRESSE_BUG}.`);
    }
  }

  return (
    <Feuille titre="Aide et mentions" onRetour={onRetour} libelleRetour="Paramètres">
      <Section titre="Textes">
        <Ligne titre="Politique de confidentialité" onPress={() => ouvrir('confidentialite')} />
        <Ligne titre="Conditions d'utilisation" onPress={() => ouvrir('conditions')} />
        <Ligne titre="Mentions légales" onPress={() => ouvrir('mentions')} />
        <Ligne titre="Crédits" onPress={() => ouvrir('credits')} />
      </Section>
      <Section titre="Aide">
        <Ligne titre="Signaler un bug" detail={ADRESSE_BUG} onPress={signaler} />
        <Ligne titre="Version de l'app" valeur={version} />
      </Section>
    </Feuille>
  );
}

const TEXTES: Record<PageTexte, { titre: string; provisoire: boolean; paragraphes: string[] }> = {
  confidentialite: {
    titre: 'Confidentialité',
    provisoire: true,
    paragraphes: [
      'Tes positions restent sur ton téléphone. Elles servent à retrouver les rues que tu as parcourues, puis sont effacées au bout de 7 jours.',
      "Ton compte garde seulement les rues parcourues, les jours où tu y es passé (jamais l'heure), tes timbres, tes kilomètres et tes pas par jour, ton profil et tes réglages.",
      'Tes amis ne voient jamais ta position, ton tracé ni tes passages. Seulement ce que tu choisis dans Confidentialité.',
      'Tu peux télécharger tes données, effacer ton historique ou supprimer ton compte à tout moment, dans les paramètres.',
    ],
  },
  conditions: {
    titre: "Conditions d'utilisation",
    provisoire: true,
    paragraphes: ["Reste sur les accès publics et légaux. Aucun lieu ne demande d'entrer là où c'est interdit."],
  },
  mentions: {
    titre: 'Mentions légales',
    provisoire: true,
    paragraphes: ['Éditeur, hébergement et contact : à compléter avant la publication.'],
  },
  credits: {
    titre: 'Crédits',
    provisoire: false,
    paragraphes: [
      'Rues, lieux et contours : © les contributeurs OpenStreetMap. Données disponibles sous licence ODbL (Open Database License).',
      'Police : Bricolage Grotesque, sous licence SIL Open Font License.',
      'Icônes : Tabler Icons, sous licence MIT.',
    ],
  },
};

export function PageTexteLegal({ page, onRetour }: { page: PageTexte; onRetour: () => void }) {
  const t = TEXTES[page];
  return (
    <Feuille titre={t.titre} onRetour={onRetour} libelleRetour="Aide">
      {t.provisoire && (
        <View style={styles.provisoire}>
          <Text style={styles.provisoireTexte}>À RÉDIGER. Texte provisoire, pas encore relu.</Text>
        </View>
      )}
      {t.paragraphes.map((p, i) => (
        <Text key={i} style={s.texte}>
          {p}
        </Text>
      ))}
      {page === 'credits' && (
        <Ligne
          titre="Licence OpenStreetMap"
          detail="openstreetmap.org/copyright"
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        />
      )}
    </Feuille>
  );
}

const styles = StyleSheet.create({
  provisoire: {
    padding: espace.s,
    borderWidth: trait,
    borderColor: couleurs.encre,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  provisoireTexte: {
    fontFamily: polices.gras,
    fontSize: 13,
    letterSpacing: 0.5,
    color: couleurs.encre,
  },
});
