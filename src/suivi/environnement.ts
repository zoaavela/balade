import Constants, { ExecutionEnvironment } from 'expo-constants';

// Vrai dans Expo Go : le suivi en arrière-plan n'y existe pas, l'app doit rester ouverte.
// Faux dans la build de développement et la version finale.
export const dansExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
