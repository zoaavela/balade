import * as Notifications from 'expo-notifications';

import type { Lieu } from '@/cartes/lieux';

// Notifications locales uniquement, créées sur le téléphone : rien ne passe par un serveur.

// App ouverte : pas de bandeau, c'est l'écran « Nouveau timbre » qui s'affiche.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function demanderNotifications() {
  try {
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  } catch {
    // Refus ou erreur : l'app marche sans, les cartes arrivent quand même dans l'album.
  }
}

export async function notifierNouvelleCarte(lieu: Lieu) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Nouveau timbre', body: `${lieu.nom} rejoint ta collection.` },
      trigger: null, // tout de suite
    });
  } catch {
    // Notifications refusées : rien à faire.
  }
}
