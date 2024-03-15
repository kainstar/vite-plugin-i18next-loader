import { setProperty } from 'dot-prop';
import path from 'node:path';
import { createLogger, Plugin } from 'vite';
import { globbySync } from 'globby';

import {
  assertExistence,
  enumerateLangs,
  I18nResolvedVirtualModuleId,
  I18nVirtualModuleId,
  jsNormalizedLang,
  loadAndParse,
  resolvePaths,
} from './utils.js';

export interface Options {
  /**
   * Enable debug logging
   */
  debug?: boolean;
  /**
   * Locale top level directory paths ordered from least specialized to most specialized
   *  e.g. lib locale -> app locale
   *
   * Locales loaded later will overwrite any duplicated key via a deep merge strategy.
   */
  paths: string[];

  /**
   * i18next namespace
   *
   * @default 'translation'
   */
  i18nNS?: string;

  /**
   * Glob patterns to match files
   *
   * @default ['**\/*.json', '**\/*.yml', '**\/*.yaml']
   */
  include?: string[];
}

export interface ResBundle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [lang: string]: Record<string, any>;
}

const factory = ({
  paths,
  include = ['**/*.json', '**/*.yml', '**/*.yaml'],
  i18nNS = 'translation',
  debug,
}: Options) => {
  const log = createLogger('info', { prefix: '[@kainstar/vite-plugin-i18next-loader]' });

  function loadLocales() {
    const localeDirs = resolvePaths(paths, process.cwd());
    assertExistence(localeDirs);

    const appResBundle: ResBundle = {};
    const loadedFiles: string[] = [];
    let allLangs: Set<string> = new Set();

    localeDirs.forEach((nextLocaleDir) => {
      // all subdirectories match language codes
      const langs = enumerateLangs(nextLocaleDir);
      allLangs = new Set([...allLangs, ...langs]);

      for (const lang of langs) {
        const langDir = path.join(nextLocaleDir, lang); // top level lang dir
        const langFiles = globbySync(include, {
          cwd: langDir,
          absolute: true,
        }); // all lang files matching patterns in langDir

        for (const langFile of langFiles) {
          loadedFiles.push(langFile); // track for fast hot reload matching
          const content = loadAndParse(langFile);

          const namespaceFilepath = path.relative(langDir, langFile);
          const extname = path.extname(langFile);
          const namespaceParts = namespaceFilepath.replace(extname, '').split(path.sep);
          const namespace = [lang].concat(i18nNS, namespaceParts).join('.');
          setProperty(appResBundle, namespace, content);
        }
      }
    });

    if (debug) {
      log.info('Bundling locales (ordered least specific to most):\n' + loadedFiles.map((f) => '\t' + f).join('\n'), {
        timestamp: true,
      });
    }

    // one bundle - works, no issues with dashes in names
    // const bundle = `export default ${JSON.stringify(appResBundle)}`

    // named exports, requires manipulation of names
    let namedBundle = '';
    let defaultExport = 'const resources = { \n';

    for (const lang of allLangs) {
      const langIdentifier = jsNormalizedLang(lang);
      namedBundle += `export const ${langIdentifier} = ${JSON.stringify(appResBundle[lang])}\n`;
      defaultExport += `"${lang}": ${langIdentifier},\n`;
    }

    defaultExport += '}';
    defaultExport += '\nexport default resources\n';

    const bundle = namedBundle + defaultExport;

    if (debug) {
      log.info(`Locales module '${I18nResolvedVirtualModuleId}':\n${bundle}`, {
        timestamp: true,
      });
    }
    return bundle;
  }

  const plugin: Plugin = {
    name: 'vite-plugin-i18next-loader', // required, will show up in warnings and errors
    resolveId(id) {
      if (id === I18nVirtualModuleId) {
        return I18nResolvedVirtualModuleId;
      }
      return null;
    },
    load(id) {
      if (id !== I18nResolvedVirtualModuleId) {
        return null;
      }

      return loadLocales();
    },

    /**
     * Watch translation files and trigger an update.
     */
    async handleHotUpdate({ file, server }) {
      const isLocaleFile =
        file.match(/\.(json|yml|yaml)$/) && paths.some((p) => file.startsWith(path.join(process.cwd(), p)));
      if (isLocaleFile) {
        log.info(`Changed locale file: ${file}`, {
          timestamp: true,
        });

        const { moduleGraph } = server;

        const module = moduleGraph.getModuleById(I18nResolvedVirtualModuleId);
        if (module) {
          await server.reloadModule(module);
        }
      }
    },
  };
  return plugin;
};

export default factory;
