import fs from 'node:fs';
import path from 'node:path';
import YAML from 'js-yaml';

// don't export these from index so the external types are cleaner
export const I18nVirtualModuleId = 'virtual:i18next-loader';

export const I18nResolvedVirtualModuleId = `\0${I18nVirtualModuleId}`;

export function jsNormalizedLang(lang: string) {
  return lang.replace(/-/g, '_');
}

export function enumerateLangs(dir: string) {
  return fs.readdirSync(dir).filter(function (file) {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}

export function resolvePaths(paths: string[], cwd: string) {
  return paths.map((override) => {
    if (path.isAbsolute(override)) {
      return override;
    } else {
      return path.join(cwd, override);
    }
  });
}

export function assertExistence(paths: string[]) {
  for (const dir of paths) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Directory does not exist: ${dir}`);
    }
  }
}

export function loadAndParse(langFile: string) {
  const fileContent = fs.readFileSync(langFile, 'utf-8');
  const extname = path.extname(langFile);
  let parsedContent: any = {};

  try {
    if (extname === '.yaml' || extname === '.yml') {
      parsedContent = YAML.load(fileContent);
    } else {
      parsedContent = JSON.parse(fileContent);
    }
  } catch (e) {
    throw new Error(`parsing file ${langFile}: ${e}`, {
      cause: e,
    });
  }

  return parsedContent;
}
