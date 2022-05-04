const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    entry :
    {
        sender : './src/js/sender.ts',
        receiver : './src/js/receiver.ts'
    },
    module : {
        rules : [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: "Sender",
            filename : "sender/index.html",
            template : "src/assets/template.html",
            chunks : ["sender"]
        }),
        new HtmlWebpackPlugin({
            title: "Receiver",
            filename : "receiver/index.html",
            template : "src/assets/template.html",
            chunks : ["receiver"]
        })
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name]/main.js',
        path: path.resolve(__dirname, 'dist/sender'),
    },
    devServer: {
        compress: true,
        hot: true,
        host: "localhost",
        port: 3000
    }
}