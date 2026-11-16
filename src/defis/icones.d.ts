// Les icônes Tabler importées une par une (voir defis.ts) : le paquet ne fournit pas
// les types de ces chemins, ce sont les mêmes composants que ceux de l'index.
declare module '@tabler/icons-react-native/*' {
  import type { Icon } from '@tabler/icons-react-native';
  const icone: Icon;
  export default icone;
}
