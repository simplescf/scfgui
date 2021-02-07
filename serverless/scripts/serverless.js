/*
 * @Author: your name
 * @Date: 1985-10-26 16:15:00
 * @LastEditTime: 2021-02-01 19:28:46
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: /scfgui-client/serverless/scripts/serverless.js
 */
'use strict';

require('essentials');

// global graceful-fs patch
// https://github.com/isaacs/node-graceful-fs#global-patching
require('graceful-fs').gracefulify(require('fs'));

if (require('../lib/utils/tabCompletion/isSupported') && process.argv[2] === 'completion') {
  require('../lib/utils/autocomplete')();
  return;
}

const handleError = require('../lib/cli/handle-error');

let serverless;

process.once('uncaughtException', (error) =>
  handleError(error, {
    isUncaughtException: true,
    isLocallyInstalled: serverless && serverless.isLocallyInstalled,
  })
);

const processSpanPromise = (async () => {
  try {
    const wait = require('timers-ext/promise/sleep');
    await wait(); // Ensure access to "processSpanPromise"
    require('../lib/utils/analytics').sendPending({
      serverlessExecutionSpan: processSpanPromise,
    });

    if (await require('../lib/cli/eventually-list-version')()) return;

    const uuid = require('uuid');
    const Serverless = require('../lib/Serverless');
    const resolveConfigurationPath = require('../lib/cli/resolve-configuration-path');

    serverless = new Serverless({ configurationPath: await resolveConfigurationPath() });

    try {
      serverless.onExitPromise = processSpanPromise;
      serverless.invocationId = uuid.v4();
      await serverless.init();
      if (serverless.invokedInstance) {
        serverless.invokedInstance.invocationId = serverless.invocationId;
        serverless = serverless.invokedInstance;
      }
      await serverless.run();
    } catch (error) {
      // If Enterprise Plugin, capture error
      let enterpriseErrorHandler = null;
      serverless.pluginManager.plugins.forEach((p) => {
        if (p.enterprise && p.enterprise.errorHandler) {
          enterpriseErrorHandler = p.enterprise.errorHandler;
        }
      });
      if (!enterpriseErrorHandler) throw error;
      try {
        await enterpriseErrorHandler(error, serverless.invocationId);
      } catch (enterpriseErrorHandlerError) {
        process.stdout.write(`${enterpriseErrorHandlerError.stack}\n`);
      }
      throw error;
    }
  } catch (error) {
    handleError(error);
  }
})();
