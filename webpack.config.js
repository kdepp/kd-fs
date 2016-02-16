var webpack = require('webpack'),
    path = require('path');

module.exports = {
    entry: './xfs.js',
    target: 'node',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'kdfs.js',
        library: 'kdfs',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loaders: ['babel?presets[]=stage-0&presets[]=es2015']
            }
        ]
    }
};
