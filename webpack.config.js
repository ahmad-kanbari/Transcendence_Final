const path = require('path');

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
  devServer: {
  proxy: [
    {
      context: ['/api'],
      target: 'http://localhost:3000/',
      secure: false,
      changeOrigin: true,
    },
  ],
  static: {
    directory: path.join(__dirname, '/'),
  },
  historyApiFallback: true,
  port: 3003,
}

};
