const path = require('path');

module.exports = [
  // Content script bundle
  {
    entry: './src/content.js',
    output: {
      filename: 'content.js',
      path: path.resolve(__dirname, 'dist'),
    },
    mode: 'production',
  },
  // Popup script bundle
  {
    entry: './src/popup.js',
    output: {
      filename: 'popup.js',
      path: path.resolve(__dirname, 'dist'),
    },
    mode: 'production',
  },
];
