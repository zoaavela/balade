import * as Haptics from 'expo-haptics';

import { option } from './options';

// Toutes les vibrations de l'app passent par ici, pour respecter le réglage « Vibrations ».

export function vibrerLeger() {
  if (option('vibrations')) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function vibrerMoyen() {
  if (option('vibrations')) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function vibrerSucces() {
  if (option('vibrations')) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
