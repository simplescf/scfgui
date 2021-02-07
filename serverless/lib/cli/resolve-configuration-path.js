'use strict';

const path = require('path');
const fs = require('fs').promises;
const ServerlessError = require('../serverless-error');
const fileExists = require('../utils/fs/fileExists');
const logDeprecation = require('../utils/logDeprecation');

const supportedExtensions = new Set(['yml', 'yaml', 'json', 'js', 'ts']);

module.exports = async () => {
  const customConfigName = (() => {
    const configParamIndex = (() => {
      const paramIndex = process.argv.indexOf('--config');
      if (paramIndex !== -1) return paramIndex;
      return process.argv.indexOf('-c');
    })();
    return configParamIndex === -1 ? null : process.argv[configParamIndex + 1];
  })();

  if (customConfigName) {
    const customConfigPath = path.resolve(customConfigName);
    if (!supportedExtensions.has(path.extname(customConfigPath).slice(1))) {
      throw new ServerlessError(
        'Invalid "--config" value: Unsupported file extension ' +
          `(expected one of: ${Array.from(supportedExtensions).join(', ')}`,
        'INVALID_SERVICE_CONFIG_PATH'
      );
    }
    const stats = await (async () => {
      try {
        return await fs.stat(customConfigPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new ServerlessError(
            `'Invalid "--config" value: Cannot find "${customConfigName}" in service folder`,
            'INVALID_SERVICE_CONFIG_PATH'
          );
        }
        throw new ServerlessError(
          `Invalid "--config" value: "${customConfigName}" is not accessible: ${error.stack}`,
          'INVALID_SERVICE_CONFIG_PATH'
        );
      }
    })();
    if (!stats.isFile()) {
      throw new ServerlessError(
        `Invalid "--config" value: "${customConfigName}" is not a file`,
        'INVALID_SERVICE_CONFIG_PATH'
      );
    }
    if (process.cwd() !== path.dirname(customConfigPath)) {
      logDeprecation(
        'NESTED_CUSTOM_CONFIGURATION_PATH',
        'Service configuration is expected to be placed in a root of a service (working directory). All paths, function handlers in a configuration are resolved against service directory".\n' +
          'Starting from next major Serverless will no longer permit configurations nested in sub directories.'
      );
    }
    return customConfigPath;
  }

  for (const extension of supportedExtensions) {
    const eventualServiceConfigPath = path.resolve(process.cwd(), `serverless.${extension}`);
    if (await fileExists(eventualServiceConfigPath)) return eventualServiceConfigPath;
  }
  return null;
};
