# @kainstar/vite-plugin-i18next-loader

[![npm package][npm-img]][npm-url] [![Build Status][build-img]][build-url] [![Downloads][downloads-img]][downloads-url] [![Issues][issues-img]][issues-url] [![Commitizen Friendly][commitizen-img]][commitizen-url] [![Semantic Release][semantic-release-img]][semantic-release-url]

Vite plugin to client bundle i18next locales composited from one to many json/yaml files from one to many libraries. Zero config HMR support included.

This vite-plugin i18next loader generates the `resources` structure necessary for [i18next](https://github.com/i18next/i18next). The structure is made available as a [virtual module](https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention) to the client bundle at build time, thus avoiding loading any language resources via extra HTTP requests.

## Credit

This was forked from [alienfast/vite-plugin-i18next-loader](https://github.com/alienfast/vite-plugin-i18next-loader), simplified options and better vite HMR support. Thanks to the original authors and contributors.

## Install

```
npm add -D @kainstar/vite-plugin-i18next-loader
pnpm add -D @kainstar/vite-plugin-i18next-loader
yarn add -D @kainstar/vite-plugin-i18next-loader
```

## Features

- [x] Glob based file filtering
- [x] YAML and JSON support
- [x] HMR support

## Usage

Given a locales directory, by default, the loader will find and parse any `json|yaml|yml` file and attribute the contents to the containing lang folder e.g. `en`. There is no need to add lang such as `en` or `de` inside your `json` or `yaml` files.

See the [`test/data` directory](https://github.com/kainstar/vite-plugin-i18next-loader/tree/main/test/data) for structure and example data.

### Sample app structure

```
└── app
    └── src
    │  └── index.js
    └── locales
       ├── de
       │   ├── foo.json
       │   └── bar.yaml
       └── en
           ├── foo.json
           └── bar.yaml
```

### vite.config.ts

```ts
import { defineConfig } from 'vite';
import i18nextLoader from '@kainstar/vite-plugin-i18next-loader';

export default defineConfig({
  plugins: [i18nextLoader({ paths: ['./node_modules/foo/locales', './locales'] })],
});
```

### app.ts

```typescript
// File: app.ts
import i18n from 'i18next';
import resources from 'virtual:i18next-loader';

i18n.init({
  resources,
});

// Use the resources as documented on i18next.com
i18n.t('key');
```

## Options

```ts
export interface Options {
  /**
   * Enable debug logging
   */
  debug?: boolean;
  /**
   * Glob patterns to match files
   *
   * Default: ['**\/*.json', '**\/*.yml', '**\/*.yaml']
   */
  include?: string[];

  /**
   * Locale top level directory paths ordered from least specialized to most specialized
   *  e.g. lib locale -> app locale
   *
   * Locales loaded later will overwrite any duplicated key via a deep merge strategy.
   */
  paths: string[];
}
```

### `include` to filtering files read

You can filter files in your file structure by specifying any glob supported by [`globby`](https://github.com/sindresorhus/globby). By default, any `json|yaml|yml` in the `paths` directories will be loaded.

#### Only json

```ts
{
  include: ['**/*.json'];
}
```

#### All json except one file

```ts
{
  include: ['**/*.json', '!**/excludeThis.json'];
}
```

### `paths` for overriding/white labeling

Applications that reuse libraries e.g. white labeling, can utilize one to many sets of locale directories that the app will override.

```ts
{
  paths: ['../node_modules/lib1/locales', './locales']; // from least to most specialized
}
```

This configures the loader to work on a file structure like the following:

```
└── app
    ├── src
    │  └── app.js
    ├── locales
    │  └── en
    │      ├── foo.json
    │      └── bar.yaml
    └── node_modules
        └── lib1
            └── locales
               └── en
                   ├── foo.json
                   └── bar.yaml
```

Everything from `./locales` will override anything specified in one to many libraries.

### Resolution

The following file structure would result in resources loaded as below:

```
└── app
    └── locales
       ├── index.js
       └── en
           ├── green.yaml
           ├── blue
           └──── foo.yaml
```

green.yaml

```yml
tree:
  species: Oak
```

blue/foo.yaml

```yml
water:
  ocean: Quite large
```

Results in this object loaded:

```json
{
  "en": {
    "green": {
      "tree": {
        "species": "Oak"
      }
    },
    "blue": {
      "foo": {
        "water": {
          "ocean": "Quite large"
        }
      }
    }
  }
}
```

## Output

Note that the [virtual module](https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention) generated has contents that conform to the [i18next resource format](https://www.i18next.com/misc/json-format).

While using the output with `import resources from 'virtual:i18next-loader'` will not be tree-shaken, it is possible to use the named outputs with a dynamic `import` for tree shaking/chunking optimizations. If you take advantage of this, please see #4 and take a moment to update this doc with more information.

**NOTE** as shown by the test output below, due to ES syntactical rules, we cannot use hyphenated lang codes. I'm open to ideas, but in the interim, affected lang codes are exported with the hyphen converted to underscore e.g. `zh-cn` has a named export of `zh_cn`. I noted that vite allows for tree-shaking of JSON files, perhaps that is worth looking at to consider how it might help us and inform our output?

```ts
export const en = {
  foo: { test: 'app foo.test en' },
  main: {
    test: 'app test en',
    sub: {
      slug: 'app sub.slug en',
      test: 'lib sub.test en',
      subsub: { slugslug: 'app sub.subsub.slugsub en', test: 'lib sub.subsub.test en' },
    },
  },
};
export const zh_cn = {
  foo: { test: 'app foo.test zh-cn' },
  main: {
    test: 'app test zh-cn',
    sub: {
      slug: 'app sub.slug zh-cn',
      test: 'lib sub.test zh-cn',
      subsub: { slugslug: 'app sub.subsub.slugsub zh-cn', test: 'lib sub.subsub.test zh-cn' },
    },
  },
};
const resources = {
  en,
  'zh-cn': zh_cn,
};
export default resources;
```

## Vite typescript definitions

In order for the vite [virtual module](https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention) to be typechecked, you will need to a declaration. Below is an example of a common type file included in a project for vite:

```ts
declare module 'virtual:i18next-loader' {
  declare const resources: import('i18next').Resource;

  export default resources;
}
```

## i18n-ally

If you are using [i18n-ally](https://marketplace.visualstudio.com/items?itemName=antfu.i18n-ally) in your project, you can configure it to use the same file structure as this plugin.

```json
{
  "i18n-ally.namespace": true,
  "i18n-ally.pathMatcher": "{locale}/{namespaces}.{ext}",
  "i18n-ally.keystyle": "nested",
  "i18n-ally.extract.keyPrefix": "{fileNameWithoutExt}"
}
```

[build-img]: https://github.com/kainstar/vite-plugin-i18next-loader/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/kainstar/vite-plugin-i18next-loader/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/@kainstar/vite-plugin-i18next-loader
[downloads-url]: https://www.npmtrends.com/@kainstar/vite-plugin-i18next-loader
[npm-img]: https://img.shields.io/npm/v/@kainstar/vite-plugin-i18next-loader
[npm-url]: https://www.npmjs.com/package/@kainstar/vite-plugin-i18next-loader
[issues-img]: https://img.shields.io/github/issues/kainstar/@kainstar/vite-plugin-i18next-loader
[issues-url]: https://github.com/kainstar/@kainstar/vite-plugin-i18next-loader/issues
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
