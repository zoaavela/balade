// Configuration Metro : ajoute les fichiers de données des rues (T18),
// lus comme des fichiers et non inclus dans le code.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('bin', 'txt');

module.exports = config;
