// Fichiers de données lus comme des assets (voir metro.config.js).
declare module '*.bin' {
  const module: number;
  export default module;
}
declare module '*.txt' {
  const module: number;
  export default module;
}
