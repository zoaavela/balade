import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';

import { formaterChrono, formaterDistance, formaterDuree } from '@/balade/mesures';
import { useBalade } from '@/balade/useBalade';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { couleurs, espace, polices, trait } from '@/theme';

// Les différents moments de l'écran Carte.
type Etat =
  | { type: 'verification' } // on regarde si l'autorisation existe déjà
  | { type: 'a-demander' } // jamais demandé : on explique avant la fenêtre d'iOS
  | { type: 'refuse' } // refusé : seul le passage par les réglages peut changer ça
  | { type: 'recherche' } // autorisé, on attend la position
  | { type: 'introuvable' } // autorisé mais pas de position (localisation coupée, pas de signal)
  | { type: 'pret'; region: Region };

const ZOOM = 0.012; // environ 1 km de large

export default function Carte() {
  const [etat, setEtat] = useState<Etat>({ type: 'verification' });
  const carteAffichee = useRef(false);
  const balade = useBalade();

  const chercherPosition = useCallback(async () => {
    carteAffichee.current = false;
    setEtat({ type: 'recherche' });
    try {
      // La dernière position connue arrive tout de suite. Sinon on demande une position fraîche.
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      carteAffichee.current = true;
      setEtat({
        type: 'pret',
        region: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: ZOOM,
          longitudeDelta: ZOOM,
        },
      });
    } catch {
      setEtat({ type: 'introuvable' });
    }
  }, []);

  const verifier = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      // Carte déjà là (retour dans l'app en pleine balade) : on n'y touche pas.
      if (!carteAffichee.current) chercherPosition();
    } else if (status === 'denied') {
      carteAffichee.current = false;
      setEtat({ type: 'refuse' });
    } else {
      setEtat({ type: 'a-demander' });
    }
  }, [chercherPosition]);

  async function demander() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') chercherPosition();
    else setEtat({ type: 'refuse' });
  }

  useEffect(() => {
    verifier();
    // Au retour des réglages, on vérifie à nouveau sans que tu aies à relancer l'app.
    const abonnement = AppState.addEventListener('change', (statut) => {
      if (statut === 'active') verifier();
    });
    return () => abonnement.remove();
  }, [verifier]);

  return (
    <Ecran titre="Carte">
      {etat.type === 'pret' && (
        <View style={styles.cadre}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={etat.region}
            showsUserLocation
            followsUserLocation={balade.statut === 'en-cours'}
            showsPointsOfInterests={false}
            showsCompass={false}
            pitchEnabled={false}>
            {balade.points.length > 1 && (
              <Polyline
                coordinates={balade.points}
                strokeColor={couleurs.encre}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>

          {balade.statut === 'en-cours' && (
            <View style={[styles.panneau, styles.compteurs]}>
              <Compteur valeur={formaterChrono(balade.duree)} legende="Durée" />
              <View style={styles.separateur} />
              <Compteur valeur={formaterDistance(balade.distance)} legende="Distance" />
            </View>
          )}

          <View style={styles.bas}>
            {balade.statut === 'terminee' ? (
              <View style={[styles.panneau, styles.resume]}>
                <Text style={styles.sousTitre}>Balade terminée</Text>
                <View style={styles.ligne}>
                  <Compteur valeur={formaterDistance(balade.distance)} legende="Distance" />
                  <Compteur valeur={formaterDuree(balade.duree)} legende="Durée" />
                </View>
                <Bouton titre="Fermer" onPress={balade.fermerResume} />
              </View>
            ) : balade.statut === 'en-cours' ? (
              <Bouton titre="Terminer" onPress={balade.terminer} />
            ) : (
              <Bouton titre="Démarrer une balade" onPress={balade.demarrer} />
            )}
          </View>
        </View>
      )}

      {(etat.type === 'verification' || etat.type === 'recherche') && (
        <View style={styles.centre}>
          <ActivityIndicator color={couleurs.encre} />
          {etat.type === 'recherche' && <Text style={styles.texte}>On cherche ta position.</Text>}
        </View>
      )}

      {etat.type === 'a-demander' && (
        <Explication
          titre="Où es-tu ?"
          texte="L'app a besoin de ta position pour tracer tes balades et débloquer les lieux où tu passes. Elle reste sur ton téléphone et n'est envoyée nulle part."
          bouton="Autoriser la localisation"
          onPress={demander}
        />
      )}

      {etat.type === 'refuse' && (
        <Explication
          titre="Localisation désactivée"
          texte="Sans ta position, l'app ne peut pas tracer tes balades ni débloquer de cartes. Tu peux l'activer dans les réglages, rubrique Position. Elle reste sur ton téléphone."
          bouton="Ouvrir les réglages"
          onPress={() => Linking.openSettings()}
        />
      )}

      {etat.type === 'introuvable' && (
        <Explication
          titre="Position introuvable"
          texte="Le téléphone n'arrive pas à te situer. Vérifie que le service de localisation est activé dans les réglages, puis réessaie."
          bouton="Réessayer"
          onPress={chercherPosition}
        />
      )}
    </Ecran>
  );
}

function Compteur({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    <View style={styles.compteur}>
      <Text style={styles.valeur}>{valeur}</Text>
      <Text style={styles.legende}>{legende}</Text>
    </View>
  );
}

function Explication(props: { titre: string; texte: string; bouton: string; onPress: () => void }) {
  return (
    <View style={styles.explication}>
      <Text style={styles.sousTitre}>{props.titre}</Text>
      <Text style={styles.texte}>{props.texte}</Text>
      <View style={styles.espaceBouton}>
        <Bouton titre={props.bouton} onPress={props.onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    marginTop: espace.m,
    marginBottom: espace.m,
    borderRadius: 18,
    borderWidth: trait,
    borderColor: couleurs.encre,
    overflow: 'hidden',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.m,
  },
  explication: {
    flex: 1,
    justifyContent: 'center',
    gap: espace.m,
    paddingBottom: espace.xl,
  },
  sousTitre: {
    fontFamily: polices.extraGras,
    fontSize: 26,
    color: couleurs.encre,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 17,
    lineHeight: 24,
    color: couleurs.encre,
  },
  espaceBouton: {
    marginTop: espace.s,
  },
  panneau: {
    backgroundColor: couleurs.fond,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  compteurs: {
    position: 'absolute',
    top: espace.m,
    left: espace.m,
    right: espace.m,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espace.s,
  },
  separateur: {
    width: trait,
    alignSelf: 'stretch',
    backgroundColor: couleurs.encre,
  },
  compteur: {
    flex: 1,
    alignItems: 'center',
  },
  valeur: {
    fontFamily: polices.extraGras,
    fontSize: 28,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'], // chiffres de même largeur : le chrono ne tremble pas
  },
  legende: {
    fontFamily: polices.moyen,
    fontSize: 13,
    color: couleurs.encreDouce,
  },
  bas: {
    position: 'absolute',
    left: espace.m,
    right: espace.m,
    bottom: espace.m,
  },
  resume: {
    padding: espace.m,
    gap: espace.m,
  },
  ligne: {
    flexDirection: 'row',
  },
});
