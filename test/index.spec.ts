/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import factory from '../src';
import { I18nResolvedVirtualModuleId } from '../src/utils';
import { esm, ThisScope } from './utils';

describe('basic', () => {
  for (const type of ['yaml', 'json']) {
    const appLocalesDir = path.join(__dirname, `./data/basic-app-${type}/locales`);
    describe(type, () => {
      let thisScope: ThisScope;

      beforeEach(() => {
        // mock vite-plugin `this` scope
        thisScope = {
          addWatchFile: () => {},
        };
      });

      function assertCommon(resStore: any) {
        expect(resStore.dev.translation.main.test).toStrictEqual('Dev dev dev!');
        expect(resStore.de.translation.main.test).toStrictEqual('Das ist ein Test!');
        expect(resStore.en.translation.main.test).toStrictEqual('This is a test!');
        expect(resStore.fr.translation.main.test).toStrictEqual('Ceci est un test!');
      }

      it.concurrent('should generate the structure', async () => {
        const load = factory({ paths: [appLocalesDir] }).load;
        const res = (load as any).call(thisScope, I18nResolvedVirtualModuleId) as string;
        const resStore = await import(esm(res));
        assertCommon(resStore);
      });

      it.concurrent('should process include', () => {
        const load = factory({ paths: [appLocalesDir], include: ['**/*.json'] }).load;
        thisScope.addWatchFile = function (path) {
          expect(path).not.toMatch(/main\.nonjson/);
        };

        (load as any).call(thisScope, I18nResolvedVirtualModuleId);
      });

      it.concurrent('should not process files that are excluded', async () => {
        const load = factory({
          paths: [appLocalesDir],
          include: [`**/*.${type}`, `!**/exclude.${type}`],
        }).load;
        thisScope.addWatchFile = function (path) {
          expect(path).not.toMatch(/exclude\.json/);
        };

        const res = (load as any).call(thisScope, I18nResolvedVirtualModuleId) as string;
        const resStore = await import(esm(res));
        expect(resStore.de.translation.main.foo).toStrictEqual(undefined);
        assertCommon(resStore);
      });
    });
  }
});
