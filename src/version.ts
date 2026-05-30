import pkg from '../package.json' with { type: 'json' };

export const PACKAGE_VERSION = pkg.version;
export const PACKAGE_NAME = pkg.name;
