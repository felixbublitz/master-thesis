const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')


module.exports = {
    entry : './src/sender/index.ts',
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
            title: "Receiver",
            template : "src/assets/template.html"
        })
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/receiver'),
    }
}