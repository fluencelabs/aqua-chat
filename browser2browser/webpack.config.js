
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        app: ['./src/index.ts']
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
    devServer: {
        contentBase: './bundle',
        hot: true
    },
    mode: "development",
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'bundle')
    },
    plugins: [
        new HtmlWebpackPlugin(),
        new webpack.HotModuleReplacementPlugin()
    ]
};

