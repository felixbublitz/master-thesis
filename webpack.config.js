const path = require('path');
var fs = require('fs');
let url = require('url');
let webpack = require('webpack');

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
        'sender' : './src/js/sender.ts',
        'receiver' : './src/js/receiver.ts',
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
         new webpack.DllReferencePlugin({
            context: __dirname,
            manifest: require( './dist/library/web_library.json')
          }),
        new HtmlWebpackPlugin({
            title: "Sender",
            filename : "sender/index.html",
            template : "src/assets/template.html",
            chunks : ["sender"],
            templateParameters: {
                dll: '../../library/web_library.dll.js',
              }
        }),
        new HtmlWebpackPlugin({
            title: "Receiver",
            filename : "receiver/index.html",
            template : "src/assets/template.html",
            chunks : ["receiver"],
            templateParameters: {
                dll: '../../library/web_library.dll.js',
              }
        }),
       
    ],
    resolve: {
        extensions: ['.ts', '.js'],
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