const path = require('path')
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


module.exports = {
    entry: path.resolve(__dirname, './js/index.js'),
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-syntax-top-level-await']
                    }
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    experiments: {
        topLevelAwait: true
    },
    plugins: [
        new webpack.ProvidePlugin(
            {
                $: "jquery",
                jQuery: "jquery",
                process: 'process/browser',
                Buffer: ['buffer', 'Buffer'],
            }
        ),
        new HtmlWebpackPlugin({
            hash: true,
            template: './index.html',
            filename: 'index.html'
        }),
        new MiniCssExtractPlugin()
    ],
    resolve: {
        fallback: {
            'crypto': require.resolve('crypto-browserify'),
            'stream': require.resolve('stream-browserify'),
            "assert": require.resolve("assert/"),
            "url": require.resolve("url"),
            "os": require.resolve("os-browserify/browser"),
            "https": require.resolve("https-browserify"),
            "http": require.resolve("stream-http"),
            "path": require.resolve("path-browserify"),
            "zlib": require.resolve("browserify-zlib"),
            "fs": false
        },
        alias: {
            process: "process/browser"
        }
    }
};
