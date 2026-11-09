import * as path from 'node:path';
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

import { mfConfig } from './module-federation.config.ts';

const isDev = process.env.NODE_ENV === 'development';

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14'];

export default defineConfig({
  context: import.meta.dirname,
  entry: {
    main: './src/index.ts',
  },
  resolve: {
    extensions: ['...', '.ts', '.tsx', '.jsx'],
  },

  devServer: {
    port: 3001,
    historyApiFallback: true,
    // Хост загружает mf-manifest.json через fetch с другого origin.
    headers: { 'Access-Control-Allow-Origin': '*' },
    watchFiles: [path.resolve(import.meta.dirname, 'src')],
  },
  output: {
    // Явный путь нужен dts-plugin: без него Rspack 2 отдаёт плагину путь вывода
    // слишком поздно, и @mf-types.zip попадает в dist/dist вместо dist.
    path: path.resolve(import.meta.dirname, 'dist'),
    // You need to set a unique value that is not equal to other applications
    uniqueName: 'transactions',
    // Адрес чанков берётся из адреса, по которому загрузили remoteEntry (ADR-0009).
    publicPath: 'auto',
    clean: true,
  },

  module: {
    generator: {
      // Имя приложения в классе не даёт CSS-модулям разных приложений
      // пересечься на одной странице.
      'css/auto': {
        localIdentName: '[uniqueName]__[local]__[hash:6]',
      },
    },
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
      },
      {
        // `*.module.css` — CSS-модули, остальные файлы — глобальные стили.
        test: /\.css$/,
        type: 'css/auto',
      },
      {
        test: /\.(jsx?|tsx?)$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: isDev,
                    refresh: isDev,
                  },
                },
              },
              env: { targets },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    new ModuleFederationPlugin(mfConfig),
    isDev ? new ReactRefreshRspackPlugin() : null,
  ].filter(Boolean),
  optimization: {
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets },
      }),
    ],
  },
});
