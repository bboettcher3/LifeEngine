const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'docs/js/'),
    },
    externals: {
        jquery: 'jQuery'
    }
};