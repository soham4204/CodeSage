const path = require("path");

module.exports = {
  mode: "development", // or "production"
  entry: "./src/index.js", // adjust if your entry file is different
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "/", // important for React Router
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"], // for Tailwind
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  devServer: {
    historyApiFallback: true, // needed for React Router
    static: {
      directory: path.join(__dirname, "public"),
    },
    port: 3000,
    open: true,
    hot: true,
  },
  ignoreWarnings: [
    {
      module: /firebase\/auth/, // ✅ silence Firebase source map warnings
    },
  ],
  devtool: "source-map", // keep source maps for your code
};
