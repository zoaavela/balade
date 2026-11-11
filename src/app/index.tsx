import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Polyline, type Region } from 'react-native-maps';

import { marquerAccueilVu } from '@/accueil/accueilVu';
import { supabase } from '@/compte/supabase';
import { effacerBaseCompte } from '@/db/base';
import { CarteEnGrand } from '@/album/CarteEnGrand';
import { distanceEntre, formaterDistance, type Point } from '@/balade/mesures';
import { MarqueurLieu } from '@/carte/MarqueurLieu';

import { lieux, type Lieu } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { joursAvecPoints, pointsDuJour } from '@/db/points';
import { useDeblocage } from '@/deblocage/Deblocage';
import { useSuiviPosition } from '@/suivi/useSuiviPosition';
import { decouperEnTrajets } from '@/trajets/decouper';
import { debutDuJour, nommerJour } from '@/trajets/jours';
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
  const { debloquees } = useDeblocage();
  const points = useSuiviPosition(etat.type === 'pret');
  const [menuSimulation, setMenuSimulation] = useState(false);
  const [choisi, setChoisi] = useState<Lieu | null>(null);
  const [maPosition, setMaPosition] = useState<Point | null>(null);
  // Sur iOS, toucher un marqueur peut aussi toucher la carte dessous : on ignore ce second tap.
  const dernierTapMarqueur = useRef(0);
  const refCarte = useRef<MapView>(null);

  // Jour affiché : null pour aujourd'hui (tracé en direct), sinon un jour passé lu dans la base.
  const [jour, setJour] = useState<Date | null>(null);
  const aDesPointsAujourdhui = points.length > 0;
  const joursPasses = useMemo(() => {
    const aujourdhui = debutDuJour(new Date()).getTime();
    return joursAvecPoints().filter((j) => j.getTime() < aujourdhui);
    // Relu quand on change de jour, ou quand le premier point du jour arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jour, aDesPointsAujourdhui]);
  const pointsAffiches = useMemo(() => (jour ? pointsDuJour(jour) : points), [jour, points]);
  const trajets = useMemo(() => decouperEnTrajets(pointsAffiches), [pointsAffiches]);

  // Place du jour affiché dans la liste des jours passés (-1 : aujourd'hui).
  const rang = jour ? joursPasses.findIndex((j) => j.getTime() === jour.getTime()) : -1;
  const jourPrecedent = jour ? joursPasses[rang - 1] : joursPasses[joursPasses.length - 1];
  const surAujourdhui = jour === null;

  function allerAuJour(nouveau: Date | null) {
    setJour(nouveau);
    setChoisi(null);
    if (nouveau) {
      // Un jour passé : on cadre la carte sur tous ses points.
      const coordonnees = pointsDuJour(nouveau);
      if (coordonnees.length > 0) {
        refCarte.current?.fitToCoordinates(coordonnees, {
          edgePadding: { top: 120, right: 50, bottom: 60, left: 50 },
          animated: true,
        });
      }
    } else {
      // Retour à aujourd'hui : on revient sur toi.
      const ici = maPosition ?? points.at(-1);
      if (ici) {
        refCarte.current?.animateToRegion({
          latitude: ici.latitude,
          longitude: ici.longitude,
          latitudeDelta: ZOOM,
          longitudeDelta: ZOOM,
        });
      }
    }
  }

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
      // Carte déjà affichée (retour dans l'app) : on n'y touche pas.
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
    <Ecran
      titre="Carte"
      // Menu caché de simulation : n'existe qu'en mode développement.
      onAppuiLongTitre={__DEV__ ? () => setMenuSimulation(true) : undefined}>
      {__DEV__ && menuSimulation && <MenuSimulation onFermer={() => setMenuSimulation(false)} />}

      {!menuSimulation && etat.type === 'pret' && (
        <View style={styles.cadre}>
          <MapView
            ref={refCarte}
            style={StyleSheet.absoluteFill}
            initialRegion={etat.region}
            showsUserLocation
            onUserLocationChange={(e) => {
              const c = e.nativeEvent.coordinate;
              if (c) setMaPosition({ latitude: c.latitude, longitude: c.longitude });
            }}
            onPress={() => {
              if (Date.now() - dernierTapMarqueur.current > 400) setChoisi(null);
            }}
            showsPointsOfInterests={false}
            showsCompass={false}
            pitchEnabled={false}>
            {trajets.map(
              (trajet) =>
                trajet.length > 1 && (
                  <Polyline
                    key={trajet[0].horodatage}
                    coordinates={trajet}
                    strokeColor={couleurs.encre}
                    strokeWidth={5}
                    lineCap="round"
                    lineJoin="round"
                  />
                ),
            )}
            {lieux.map((lieu) => (
              <MarqueurLieu
                key={lieu.id}
                lieu={lieu}
                debloque={debloquees.has(lieu.id)}
                onPress={() => {
                  dernierTapMarqueur.current = Date.now();
                  setChoisi(lieu);
                }}
              />
            ))}
          </MapView>

          <View style={styles.selecteur}>
            <Fleche
              sens="‹"
              actif={jourPrecedent !== undefined}
              onPress={() => jourPrecedent && allerAuJour(jourPrecedent)}
              libelle="Jour précédent"
            />
            <View style={styles.selecteurMilieu}>
              <Text style={styles.selecteurJour} numberOfLines={1}>
                {nommerJour(jour ?? new Date())}
              </Text>
              <Text style={styles.selecteurTrajets}>{compterTrajets(trajets.length)}</Text>
            </View>
            <Fleche
              sens="›"
              actif={!surAujourdhui}
              onPress={() => !surAujourdhui && allerAuJour(joursPasses[rang + 1] ?? null)}
              libelle="Jour suivant"
            />
          </View>

          {choisi && !debloquees.has(choisi.id) && (
            <View style={styles.infoLieu}>
              <Text style={styles.infoNom} numberOfLines={2}>
                {choisi.nom}
              </Text>
              <Text style={styles.infoDistance}>
                {(() => {
                  // Ta position sur la carte, sinon ton dernier point, sinon le centre de départ.
                  const depuis = maPosition ?? points.at(-1) ?? etat.region;
                  return `À ${formaterDistance(distanceEntre(depuis, choisi))}`;
                })()}
              </Text>
            </View>
          )}
        </View>
      )}

      {choisi && debloquees.has(choisi.id) && (
        <CarteEnGrand
          lieu={choisi}
          debloqueLe={debloquees.get(choisi.id)}
          onFermer={() => setChoisi(null)}
        />
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
          texte="L'app a besoin de ta position pour enregistrer tes trajets et débloquer les lieux où tu passes. Elle reste sur ton téléphone et n'est envoyée nulle part."
          bouton="Autoriser la localisation"
          onPress={demander}
        />
      )}

      {etat.type === 'refuse' && (
        <Explication
          titre="Localisation désactivée"
          texte="Sans ta position, l'app ne peut ni enregistrer tes trajets ni débloquer de cartes. Tu peux l'activer dans les réglages, rubrique Position. Ta position reste sur ton téléphone."
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

function compterTrajets(n: number): string {
  if (n === 0) return 'Aucun trajet';
  return n === 1 ? '1 trajet' : `${n} trajets`;
}

function Fleche(props: { sens: string; actif: boolean; onPress: () => void; libelle: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={!props.actif}
      accessibilityRole="button"
      accessibilityLabel={props.libelle}
      accessibilityState={{ disabled: !props.actif }}
      hitSlop={8}
      style={styles.fleche}>
      <Text style={[styles.flecheTexte, !props.actif && styles.flecheInactive]}>{props.sens}</Text>
    </Pressable>
  );
}

// Uniquement en développement : simule ta position sur un lieu pour tester le déblocage.
// Le faux point n'est pas écrit dans ton tracé.
function MenuSimulation({ onFermer }: { onFermer: () => void }) {
  const { debloquees, traiterPoint } = useDeblocage();
  return (
    <View style={styles.menu}>
      <Text style={styles.sousTitre}>Simuler une position</Text>
      <ScrollView contentContainerStyle={styles.menuListe}>
        {lieux.map((lieu) => (
          <Pressable
            key={lieu.id}
            style={styles.menuLigne}
            onPress={() => {
              onFermer();
              traiterPoint({ latitude: lieu.latitude, longitude: lieu.longitude });
            }}>
            <Text style={styles.texte}>{lieu.nom}</Text>
            {debloquees.has(lieu.id) && <Text style={styles.menuDeja}>débloqué</Text>}
          </Pressable>
        ))}
      </ScrollView>
      <Bouton
        titre="Simuler un nouveau téléphone"
        variante="clair"
        onPress={async () => {
          // On se déconnecte d'abord : les écrans qui lisent la base disparaissent,
          // puis on efface la base locale. À la reconnexion, tout revient du compte.
          await supabase?.auth.signOut();
          setTimeout(effacerBaseCompte, 500); // le temps que les écrans se ferment
        }}
      />
      <Bouton
        titre="Revoir l'accueil"
        variante="clair"
        onPress={() => {
          onFermer();
          marquerAccueilVu(false);
        }}
      />
      <Bouton titre="Fermer" onPress={onFermer} />
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
  selecteur: {
    position: 'absolute',
    top: espace.m,
    left: espace.m,
    right: espace.m,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espace.xs,
    backgroundColor: couleurs.fond,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  selecteurMilieu: {
    flex: 1,
    alignItems: 'center',
  },
  selecteurJour: {
    fontFamily: polices.extraGras,
    fontSize: 18,
    color: couleurs.encre,
  },
  selecteurTrajets: {
    fontFamily: polices.moyen,
    fontSize: 13,
    color: couleurs.encreDouce,
  },
  fleche: {
    width: 48,
    alignItems: 'center',
  },
  flecheTexte: {
    fontFamily: polices.extraGras,
    fontSize: 32,
    lineHeight: 36,
    color: couleurs.encre,
  },
  flecheInactive: {
    opacity: 0.2,
  },
  infoLieu: {
    position: 'absolute',
    left: espace.m,
    right: espace.m,
    bottom: espace.m,
    padding: espace.m,
    gap: espace.xs,
    backgroundColor: couleurs.fond,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  infoNom: {
    fontFamily: polices.extraGras,
    fontSize: 22,
    color: couleurs.encre,
  },
  infoDistance: {
    fontFamily: polices.moyen,
    fontSize: 16,
    color: couleurs.encreDouce,
  },
  menu: {
    flex: 1,
    gap: espace.m,
    paddingTop: espace.m,
    paddingBottom: espace.m,
  },
  menuListe: {
    gap: espace.xs,
  },
  menuLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espace.s,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.encreDouce,
  },
  menuDeja: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.encreDouce,
  },
});
