var combineLoaders = require("webpack-combine-loaders")

{
  module: {
    loaders: [
      {test: /\.styl$/, loader: 'style-loader!css-loader!stylus-loader'},
      {
        test: /\.elm$/,
        exclude: [/elm-stuff/, /node_modules/],
        loader:  combineLoaders([
          {
            loader: "elm-hot"
          },
          {
            loader: 'elm-webpack',
            options: {
            }
          }
        ])
      }
    ],
    noParse: [/.elm$/, /.styl$/]
  }
}
