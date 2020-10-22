
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: {
        app: ['./src/index.ts']
    },
    devServer: {
        contentBase: './bundle',
        hot: false,
        inline: false,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    mode: "development",
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'bundle')
    },
    plugins: [
        new CopyWebpackPlugin([{
            from: './*.html'
        }]),
        new webpack.HotModuleReplacementPlugin()
    ]
};

