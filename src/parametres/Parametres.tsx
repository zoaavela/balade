import { useState } from 'react';
import { Alert, Modal, View } from 'react-native';

import { useProfil } from '@/compte/profil';
import { supabase } from '@/compte/supabase';
import { useSession } from '@/compte/useSession';
import { ModifierProfil } from '@/profil/ModifierProfil';
import { espace } from '@/theme';

import { Appareils } from './Appareils';
import { ChangerEmail } from './ChangerEmail';
import { changerConfidentialite, useConfidentialite, type Confidentialite } from './confidentialite';
import { effacerHistorique, exporterDonnees } from './donnees';
import { Feuille, GrandBouton, Ligne, LigneInterrupteur, Section, ZoneDanger } from './elements';
import { decrirePause, mettreEnPause, reprendreSuivi, usePause } from './pause';
import { SupprimerCompte } from './SupprimerCompte';
import { lireZones, ZONES_MAX } from './zones';
import { ZonesPrivees } from './ZonesPrivees';

// Les pages des paramètres. Chaque sous-page sait où revenir.
type Vue = 'accueil' | 'compte' | 'confidentialite' | 'positions' | 'email' | 'appareils' | 'zones' | 'supprimer';

const PARENT: Record<Vue, Vue | null> = {
  accueil: null,
  compte: 'accueil',
  confidentialite: 'accueil',
  positions: 'accueil',
  email: 'compte',
  appareils: 'compte',
  supprimer: 'compte',
  zones: 'positions',
};

// Écran des paramètres (T32), ouvert par l'icône réglages du profil. L'accueil montre
// un grand bouton par section, et chaque section s'ouvre sur sa propre page.
// Partie 1 : Compte, Confidentialité, Positions. Suivi, Notifications, Affichage et Aide ensuite.
export function Parametres({ onFermer }: { onFermer: (profilChange: boolean) => void }) {
  const [vue, setVue] = useState<Vue>('accueil');
  const [profilChange, setProfilChange] = useState(false);
  const parent = PARENT[vue];
  const retour = () => (parent ? setVue(parent) : onFermer(profilChange));

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={retour}>
      {vue === 'accueil' && <Accueil onFermer={retour} ouvrir={setVue} />}
      {vue === 'compte' && (
        <PageCompte onRetour={retour} ouvrir={setVue} onProfilChange={() => setProfilChange(true)} />
      )}
      {vue === 'confidentialite' && <PageConfidentialite onRetour={retour} />}
      {vue === 'positions' && <PagePositions onRetour={retour} ouvrir={setVue} />}
      {vue === 'email' && <ChangerEmail onRetour={retour} />}
      {vue === 'appareils' && <Appareils onRetour={retour} />}
      {vue === 'zones' && <ZonesPrivees onRetour={retour} />}
      {vue === 'supprimer' && <SupprimerCompte onRetour={retour} />}
    </Modal>
  );
}

function Accueil({ onFermer, ouvrir }: { onFermer: () => void; ouvrir: (v: Vue) => void }) {
  return (
    <Feuille titre="Paramètres" onRetour={onFermer} libelleRetour="Profil">
      <View style={{ gap: espace.m }}>
        <GrandBouton
          titre="Compte"
          detail="Profil, adresse e-mail, appareils, déconnexion"
          onPress={() => ouvrir('compte')}
        />
        <GrandBouton
          titre="Confidentialité"
          detail="Qui te voit, et ce que tes amis voient"
          onPress={() => ouvrir('confidentialite')}
        />
        <GrandBouton
          titre="Positions"
          detail="Zones privées, pause, tes données"
          onPress={() => ouvrir('positions')}
        />
      </View>
    </Feuille>
  );
}

function PageCompte({
  onRetour,
  ouvrir,
  onProfilChange,
}: {
  onRetour: () => void;
  ouvrir: (v: Vue) => void;
  onProfilChange: () => void;
}) {
  const { session } = useSession();
  const { profil, relire } = useProfil();
  const [modifier, setModifier] = useState(false);

  function deconnecter() {
    Alert.alert('Se déconnecter ?', 'Ta collection reste sauvegardée sur ton compte.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => supabase?.auth.signOut() },
    ]);
  }

  return (
    <Feuille titre="Compte" onRetour={onRetour} libelleRetour="Paramètres">
      <Section titre="Ton compte">
        <Ligne
          titre="Modifier le profil"
          detail={profil ? `@${profil.username}` : undefined}
          onPress={profil ? () => setModifier(true) : undefined}
        />
        <Ligne titre="Adresse e-mail" detail={session?.user.email} onPress={() => ouvrir('email')} />
        <Ligne titre="Appareils connectés" onPress={() => ouvrir('appareils')} />
        <Ligne titre="Se déconnecter" onPress={deconnecter} />
      </Section>

      <ZoneDanger>
        <Ligne
          titre="Supprimer mon compte"
          detail="Efface pour de bon ton compte et tout ce qu'il contient."
          danger
          onPress={() => ouvrir('supprimer')}
        />
      </ZoneDanger>

      {modifier && profil && (
        <ModifierProfil
          profil={profil}
          onFermer={(change) => {
            setModifier(false);
            if (change) {
              relire();
              onProfilChange();
            }
          }}
        />
      )}
    </Feuille>
  );
}

function PageConfidentialite({ onRetour }: { onRetour: () => void }) {
  const { reglages, setReglages, horsLigne } = useConfidentialite();

  async function changer(changement: Partial<Confidentialite>) {
    const avant = reglages;
    setReglages({ ...reglages, ...changement }); // tout de suite à l'écran
    try {
      setReglages(await changerConfidentialite(avant, changement));
    } catch {
      setReglages(avant);
      Alert.alert('Pas enregistré', 'Le serveur ne répond pas. Réessaie quand tu as du réseau.');
    }
  }

  function choisir(titre: string, options: { texte: string; valeur: Partial<Confidentialite> }[]) {
    Alert.alert(titre, undefined, [
      ...options.map((o) => ({ text: o.texte, onPress: () => changer(o.valeur) })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <Feuille titre="Confidentialité" onRetour={onRetour} libelleRetour="Paramètres">
      <Section
        titre="Qui te voit"
        note={horsLigne ? 'Pas de réseau : réglages affichés tels que la dernière fois, modification impossible.' : undefined}>
        <Ligne
          titre="Qui peut voir mon profil"
          valeur={reglages.profil_public ? 'Tout le monde' : 'Mes amis'}
          onPress={
            horsLigne
              ? undefined
              : () =>
                  choisir('Qui peut voir mon profil', [
                    { texte: 'Mes amis', valeur: { profil_public: false } },
                    { texte: 'Tout le monde', valeur: { profil_public: true } },
                  ])
          }
        />
        <Ligne
          titre="Qui peut m'envoyer une demande d'ami"
          valeur={reglages.demandes_ouvertes ? 'Tout le monde' : 'Lien ou QR code'}
          onPress={
            horsLigne
              ? undefined
              : () =>
                  choisir("Qui peut t'envoyer une demande d'ami", [
                    { texte: 'Tout le monde', valeur: { demandes_ouvertes: true } },
                    { texte: 'Seulement par lien ou QR code', valeur: { demandes_ouvertes: false } },
                  ])
          }
        />
        <LigneInterrupteur
          titre="Apparaître dans la recherche"
          detail="On peut te trouver en tapant ton username exact."
          valeur={reglages.dans_recherche}
          onChange={(v) => changer({ dans_recherche: v })}
          desactive={horsLigne}
        />
      </Section>

      <Section titre="Ce que mes amis voient" note="Jamais ta position, ton tracé ni tes passages.">
        <LigneInterrupteur
          titre="Mes timbres"
          valeur={reglages.montrer_timbres}
          onChange={(v) => changer({ montrer_timbres: v })}
          desactive={horsLigne}
        />
        <LigneInterrupteur
          titre="Mes défis"
          valeur={reglages.montrer_defis}
          onChange={(v) => changer({ montrer_defis: v })}
          desactive={horsLigne}
        />
        <LigneInterrupteur
          titre="Mes quartiers"
          valeur={reglages.montrer_quartiers}
          onChange={(v) => changer({ montrer_quartiers: v })}
          desactive={horsLigne}
        />
        <LigneInterrupteur
          titre="Mes kilomètres et mes pas"
          valeur={reglages.montrer_stats}
          onChange={(v) => changer({ montrer_stats: v })}
          desactive={horsLigne}
        />
      </Section>
    </Feuille>
  );
}

function PagePositions({ onRetour, ouvrir }: { onRetour: () => void; ouvrir: (v: Vue) => void }) {
  const { session } = useSession();
  const pause = usePause();
  const [occupe, setOccupe] = useState<'export' | 'historique' | null>(null);
  const nbZones = lireZones().length;

  function choisirPause() {
    Alert.alert('Mettre le suivi en pause', "Pendant la pause, rien n'est enregistré et aucun timbre n'est débloqué.", [
      { text: 'Une heure', onPress: () => mettreEnPause('heure') },
      { text: 'Une journée', onPress: () => mettreEnPause('jour') },
      { text: "Jusqu'à nouvel ordre", onPress: () => mettreEnPause('toujours') },
      ...(pause ? [{ text: 'Reprendre le suivi', onPress: reprendreSuivi }] : []),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  async function exporter() {
    setOccupe('export');
    try {
      await exporterDonnees(session?.user.email);
    } catch {
      Alert.alert('Export impossible', 'Il faut du réseau pour rassembler tes données. Réessaie dans un moment.');
    } finally {
      setOccupe(null);
    }
  }

  function effacer() {
    Alert.alert(
      'Effacer ton historique ?',
      'Tes positions, rues parcourues et kilomètres seront effacés, ici et sur ton compte. Tes timbres, tes défis et tes pas sont gardés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            setOccupe('historique');
            try {
              await effacerHistorique();
              Alert.alert('Historique effacé', 'Tes prochains trajets repartent de zéro.');
            } catch {
              Alert.alert("Rien n'a été effacé", 'Il faut du réseau pour effacer aussi la copie de ton compte.');
            } finally {
              setOccupe(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Feuille titre="Positions" onRetour={onRetour} libelleRetour="Paramètres">
      <Section titre="Suivi">
        <Ligne
          titre="Zones privées"
          detail="Domicile, travail : rien n'y est enregistré."
          valeur={`${nbZones} sur ${ZONES_MAX}`}
          onPress={() => ouvrir('zones')}
        />
        <Ligne
          titre="Pause du suivi"
          detail={pause ? decrirePause(pause) : undefined}
          valeur={pause ? 'En pause' : 'Actif'}
          onPress={choisirPause}
        />
      </Section>

      <Section titre="Tes données">
        <Ligne
          titre="Télécharger mes données"
          detail="Un fichier avec tout ce qui concerne ton compte."
          onPress={exporter}
          occupe={occupe === 'export'}
        />
        <Ligne
          titre="Effacer mon historique de déplacements"
          detail="Positions, rues et kilomètres. Timbres et pas gardés."
          danger
          onPress={effacer}
          occupe={occupe === 'historique'}
        />
      </Section>
    </Feuille>
  );
}
