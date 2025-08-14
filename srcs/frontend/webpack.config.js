const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/ts/app.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
      // Copy index.html to dist folder
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html'
      }),
      // Copy static assets to dist folder
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/assets', to: 'src/assets' },
          { from: 'src/pages', to: 'src/pages' },
          { from: 'src/css', to: 'src/css' },
          { from: 'src/locales', to: 'src/locales' },
          { from: 'src/oauth', to: 'src/oauth' }
        ]
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, '/'),
      },
      historyApiFallback: true,
      port: 3003,
  }
};
