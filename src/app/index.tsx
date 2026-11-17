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
import { TimbreEnGrand } from '@/timbres/TimbreEnGrand';
import { distanceEntre, formaterDistance, type Point } from '@/balade/mesures';
import { MarqueurLieu } from '@/carte/MarqueurLieu';
import { ZoneIndice } from '@/carte/ZoneIndice';
import { categories } from '@/cartes/categories';

import { lieuxPlaces, type LieuPlace } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { joursAvecPassages, passagesDuJour } from '@/db/rues';
import { useDeblocage } from '@/deblocage/Deblocage';
import { affichageLieu, indiceTouche, secretsReveles, type Affichage } from '@/deblocage/visibilite';
import { premierePosition } from '@/suivi/premierePosition';
import { useSuiviPosition } from '@/suivi/useSuiviPosition';
import { debutDuJour, nommerJour } from '@/trajets/jours';
import { tracerTrajets, useReseau, useVersionPassages } from '@/trajets/tracer';
import { couleurs, espace, polices, trait } from '@/theme';

// Les différents moments de l'écran Carte.
type Etat =
  | { type: 'verification' } // on regarde si l'autorisation existe déjà
  | { type: 'a-demander' } // jamais demandé : on explique avant la fenêtre d'iOS
  | { type: 'refuse' } // refusé : seul le passage par les réglages peut changer ça
  | { type: 'recherche' } // autorisé, on attend la position
  | { type: 'introuvable' } // autorisé mais pas de position (localisation coupée, pas de signal)
  // trouve : false si le GPS n'a pas répondu à temps. La carte s'affiche quand même,
  // sur Paris, avec un message, et se recentre dès que la position arrive.
  | { type: 'pret'; region: Region; trouve: boolean };

const ZOOM = 0.012; // environ 1 km de large
const DELAI_POSITION_MS = 15000;
const PARIS: Region = { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.12, longitudeDelta: 0.12 };

export default function Carte() {
  const [etat, setEtat] = useState<Etat>({ type: 'verification' });
  const carteAffichee = useRef(false);
  const { debloquees } = useDeblocage();
  const points = useSuiviPosition(etat.type === 'pret');
  const [menuSimulation, setMenuSimulation] = useState(false);
  const [choisi, setChoisi] = useState<LieuPlace | null>(null);
  // Ce que la carte montre de chaque lieu : marqueur, zone d'indice ou rien (T26).
  const affichages = useMemo(() => {
    const reveles = secretsReveles(debloquees);
    return lieuxPlaces.map((lieu) => ({
      lieu,
      affichage: affichageLieu(lieu, debloquees.has(lieu.id), reveles),
    }));
  }, [debloquees]);
  const zonesIndices = useMemo(
    () =>
      affichages.flatMap(({ lieu, affichage }) =>
        affichage.genre === 'indice' ? [{ lieu, centre: affichage.centre, rayon_m: affichage.rayon_m }] : [],
      ),
    [affichages],
  );
  const affichageChoisi: Affichage | null = choisi
    ? (affichages.find((a) => a.lieu.id === choisi.id)?.affichage ?? null)
    : null;
  const [maPosition, setMaPosition] = useState<Point | null>(null);
  // « Position exacte » coupée dans les réglages d'iOS : positions à 1 km près, inutilisables.
  const [precisionReduite, setPrecisionReduite] = useState(false);
  // Sur iOS, toucher un marqueur peut aussi toucher la carte dessous : on ignore ce second tap.
  const dernierTapMarqueur = useRef(0);
  const refCarte = useRef<MapView>(null);

  // Jour affiché : null pour aujourd'hui (tracé en direct), sinon un jour passé lu dans la base.
  const [jour, setJour] = useState<Date | null>(null);
  // Le tracé ne montre que des rues recalées (T19), jamais les positions brutes.
  const reseau = useReseau();
  const version = useVersionPassages();
  const passages = useMemo(
    () => passagesDuJour(jour ?? new Date()),
    // Relu au changement de jour et à chaque nouveau passage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jour, version],
  );
  const trajets = useMemo(() => (reseau ? tracerTrajets(reseau, passages) : []), [reseau, passages]);
  const aDesPassagesAujourdhui = jour === null && passages.length > 0;
  const joursPasses = useMemo(() => {
    const aujourdhui = debutDuJour(new Date()).getTime();
    return joursAvecPassages().filter((j) => j.getTime() < aujourdhui);
    // Relu quand on change de jour, ou quand le premier passage du jour arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jour, aDesPassagesAujourdhui]);

  // Place du jour affiché dans la liste des jours passés (-1 : aujourd'hui).
  const rang = jour ? joursPasses.findIndex((j) => j.getTime() === jour.getTime()) : -1;
  const jourPrecedent = jour ? joursPasses[rang - 1] : joursPasses[joursPasses.length - 1];
  const surAujourdhui = jour === null;

  function allerAuJour(nouveau: Date | null) {
    setJour(nouveau);
    setChoisi(null);
    if (nouveau) {
      // Un jour passé : on cadre la carte sur toutes ses rues parcourues.
      const coordonnees = reseau
        ? tracerTrajets(reseau, passagesDuJour(nouveau)).flatMap((t) => t.lignes.flat())
        : [];
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
    const position = await premierePosition(DELAI_POSITION_MS);
    if (position) {
      carteAffichee.current = true;
      setEtat({
        type: 'pret',
        trouve: true,
        region: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: ZOOM,
          longitudeDelta: ZOOM,
        },
      });
      return;
    }
    // Pas de réponse : service de localisation coupé, ou GPS qui ne capte pas encore.
    const service = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!service) {
      setEtat({ type: 'introuvable' });
      return;
    }
    carteAffichee.current = true;
    setEtat({ type: 'pret', trouve: false, region: PARIS });
  }, []);

  // Première vraie position après un délai dépassé : on centre la carte sur toi.
  useEffect(() => {
    if (etat.type !== 'pret' || etat.trouve || !maPosition) return;
    refCarte.current?.animateToRegion({ ...maPosition, latitudeDelta: ZOOM, longitudeDelta: ZOOM });
    setEtat({ ...etat, trouve: true });
  }, [etat, maPosition]);

  const verifier = useCallback(async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    const { status } = permission;
    setPrecisionReduite(permission.ios?.accuracy === 'reduced');
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
            onPress={(e) => {
              if (Date.now() - dernierTapMarqueur.current <= 400) return;
              // Toucher une zone d'indice montre sa devinette, ailleurs on ferme.
              const zone = indiceTouche(zonesIndices, e.nativeEvent.coordinate);
              setChoisi(zone ? zone.lieu : null);
            }}
            showsPointsOfInterests={false}
            showsCompass={false}
            pitchEnabled={false}>
            {trajets.flatMap((trajet) =>
              trajet.lignes.map((ligne, i) => (
                <Polyline
                  key={`${trajet.debut}-${i}`}
                  coordinates={ligne}
                  strokeColor={couleurs.encre}
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              )),
            )}
            {affichages.map(({ lieu, affichage }) => {
              const toucher = () => {
                dernierTapMarqueur.current = Date.now();
                setChoisi(lieu);
              };
              if (affichage.genre === 'cache') return null;
              if (affichage.genre === 'indice') {
                return (
                  <ZoneIndice
                    key={`${lieu.id}-indice`}
                    lieu={lieu}
                    centre={affichage.centre}
                    rayon_m={affichage.rayon_m}
                    onPress={toucher}
                  />
                );
              }
              return (
                <MarqueurLieu
                  key={lieu.id}
                  lieu={lieu}
                  debloque={debloquees.has(lieu.id)}
                  onPress={toucher}
                />
              );
            })}
          </MapView>

          {(!etat.trouve || precisionReduite) && (
            <View style={styles.bandeau}>
              <Text style={styles.bandeauTexte}>
                {precisionReduite
                  ? "Ta position est approximative : l'app ne peut pas enregistrer tes trajets. Active « Position exacte » dans les réglages de l'app, rubrique Position."
                  : "Le GPS ne répond pas encore. Mets-toi à découvert, loin des grands immeubles. La carte se centrera sur toi dès qu'il te trouve."}
              </Text>
            </View>
          )}

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

          {choisi && !debloquees.has(choisi.id) && affichageChoisi?.genre === 'indice' && (
            <View style={styles.infoLieu}>
              <Text style={[styles.infoCategorie, { color: categories[choisi.categorie].bordure }]}>
                Lieu à trouver · {categories[choisi.categorie].nom}
              </Text>
              <Text style={styles.infoIndice}>
                {/* Un secret révélé par un défi n'a pas de devinette : la zone suffit. */}
                {choisi.indice || 'Révélé par un défi terminé. Il se cache dans cette zone.'}
              </Text>
            </View>
          )}

          {choisi && !debloquees.has(choisi.id) && affichageChoisi?.genre === 'marqueur' && (
            <View style={styles.infoLieu}>
              <Text style={styles.infoNom} numberOfLines={2}>
                {choisi.nom}
              </Text>
              <Text style={styles.infoDistance}>
                {(() => {
                  // Ta position sur la carte, sinon ton dernier point, sinon le centre de départ.
                  const depuis = maPosition ?? points.at(-1) ?? etat.region;
                  return `À ${formaterDistance(distanceEntre(depuis, choisi.emplacement))}`;
                })()}
              </Text>
            </View>
          )}
        </View>
      )}

      {choisi && debloquees.has(choisi.id) && (
        <TimbreEnGrand
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
        {lieuxPlaces.flatMap((lieu) => {
          const e = lieu.emplacement;
          const ligne = (cle: string, titre: string, point: Point) => (
            <Pressable
              key={cle}
              style={styles.menuLigne}
              onPress={() => {
                onFermer();
                traiterPoint(point);
              }}>
              <Text style={styles.texte}>{titre}</Text>
              {debloquees.has(lieu.id) && <Text style={styles.menuDeja}>débloqué</Text>}
            </Pressable>
          );
          const lignes = [ligne(lieu.id, lieu.nom, e)];
          // Un secret : aussi un point juste en dehors, pour sentir la vibration sans le débloquer.
          if (lieu.rarete === 'secret') {
            const nord = { latitude: e.latitude + (e.rayon_m + 100) / 111_195, longitude: e.longitude };
            lignes.push(ligne(`${lieu.id}-pres`, `Près de : ${lieu.nom}`, nord));
          }
          return lignes;
        })}
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
  bandeau: {
    position: 'absolute',
    left: espace.m,
    right: espace.m,
    top: 88,
    padding: espace.s,
    backgroundColor: couleurs.fond,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 12,
  },
  bandeauTexte: {
    fontFamily: polices.moyen,
    fontSize: 14,
    lineHeight: 19,
    color: couleurs.encre,
  },
  infoCategorie: {
    fontFamily: polices.gras,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoIndice: {
    fontFamily: polices.moyen,
    fontSize: 18,
    lineHeight: 24,
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
