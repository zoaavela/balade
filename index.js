// Point d'entrée de l'app.
// Les tâches de fond sont déclarées ici, avant tout le reste : iOS peut réveiller l'app
// sans écran pour lui passer des positions, et elles doivent alors déjà exister.
import './src/suivi/tacheFond';
import './src/suivi/zones';

import 'expo-router/entry';
