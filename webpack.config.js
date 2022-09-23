const path = require('path');
var fs = require('fs');
let url = require('url');
let webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const HtmlWebpackPlugin = require('html-webpack-plugin');

const serverConfig = {
    mode: "production",
    target: 'node',
    entry :
    {
        'server' : './src/js/server.ts'
    },
    module : {
        rules : [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                include: path.resolve(__dirname, 'src/js')
            },
        ]
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'server.js',
        path: path.resolve(__dirname, 'dist'),
    }
};

const webConfig = {
    mode: "production",
    target : 'web',
    entry :
    {
        'app' : './src/js/app.ts',
    },
    module : {
        rules : [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                include: path.resolve(__dirname, 'src/js')
            },
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
          }),
          new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/assets', to: 'assets' }
            ]}),
         new webpack.DllReferencePlugin({
            context: __dirname,
            manifest: require( './dist/library/web_library.json')
          }),
        new HtmlWebpackPlugin({
            title: "App",
            filename : "app/index.html",
            template : "src/assets/template.html",
            chunks : ["app"],
            templateParameters: {
                dll: '../../library/web_library.dll.js',
              }
        }),
       
    ],
    resolve: {
        extensions: ['.ts', '.js'],
        alias : {
            stream: require.resolve('stream-browserify'),
            zlib: require.resolve('browserify-zlib'),  
        }
    },
    output: {
        filename: '[name]/main.js',
        path: path.resolve(__dirname, 'dist'),
    }
   
};

module.exports = [
    webConfig,
    serverConfig
]