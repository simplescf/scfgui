

/**
 * SERVERLESS PLATFORM CLIENT SDK: UTILS
 */

const https = require('https');
const http = require('http');
const urlUtils = require('url');
const traverse = require('traverse');
const minimatch = require('minimatch');
const WebSocket = require('ws');
const {
  Login: TencentAuth,
  Others: TencentUtils,
  Cam: TencentCAM,
  Debug: TencentDebug,
  Logs: TencentLog,
} = require('@serverless/utils-china');

const utils = {};

/**
 * Wait for a number of miliseconds
 * @param {*} wait
 */
const sleep = async (wait) => new Promise((resolve) => setTimeout(() => resolve(), wait));

/**
 * Make HTTP API requests, easily
 * @param {*} options.endpoint
 * @param {*} options.data
 * @param {*} options.accessKey
 * @param {*} options.method
 */
const request = async (options) => {
  const url = urlUtils.parse(options.endpoint);
  const requestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    path: url.path,
    method: options.method || 'POST',
    headers: options.headers || {
      'Content-Type': 'application/json',
    },
  };

  const requestWrap = () =>
    new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          if (!res.complete) {
            return reject(
              new Error('The connection was terminated while the message was still being sent.')
            );
          }
          if (!rawData && res.statusCode < 400) {
            return resolve();
          }
          try {
            const data = JSON.parse(rawData);
            if (res.statusCode >= 400) {
              const error = new Error(
                data.message ||
                  `${res.statusCode} error of ${requestOptions.method} ${options.endpoint}`
              );
              error.response = {
                status: res.statusCode,
                data,
              };
              return reject(error);
            }
            return resolve(data);
          } catch (e) {
            const error = new Error(
              `Failed pass returning data of ${requestOptions.method} ${options.endpoint}`
            );
            error.response = {
              status: res.statusCode,
              data: rawData,
            };
            return reject(error);
          }
        });
      });

      if (options.accessKey) {
        req.setHeader('authorization', options.accessKey);
      }

      req.on('error', (e) => {
        reject(e);
      });

      if (options.data) {
        req.write(options.data);
      }
      req.end();
    });

  try {
    return await requestWrap();
  } catch (error) {
    // log the request so that we could debug that stubborn random publish error.
    if (error.response && error.response.status && error.response.data.message) {
      throw new Error(`${error.response.status} - ${error.response.data.message}`);
    }
    throw error;
  }
};

/**
 * Resolves any variables that require resolving before the engine.
 * This currently supports only ${env}.  All others should be resolved within the deployment engine.
 * @param {*} inputs
 */
const resolveInputEnvVariables = (inputs) => {
  const regex = /\${(\w*:?[\w\d.-]+)}/g;
  let variableResolved = false;
  const resolvedInputs = traverse(inputs).forEach(function (value) {
    const matches = typeof value === 'string' ? value.match(regex) : null;
    if (matches) {
      let newValue = value;
      for (const match of matches) {
        // Search for ${env:}
        if (/\${env:(\w*[\w.-_]+)}/g.test(match)) {
          const referencedPropertyPath = match.substring(2, match.length - 1).split(':');
          newValue = process.env[referencedPropertyPath[1]];
          variableResolved = true;
        }
      }
      this.update(newValue);
    }
  });
  if (variableResolved) {
    return resolveInputEnvVariables(resolvedInputs);
  }
  return resolvedInputs;
};

// Add to utils object
utils.sleep = sleep;
utils.request = request;
utils.resolveInputEnvVariables = resolveInputEnvVariables;

/**
 *
 * Only load these Utilies when in a Node.js Environment
 *
 */

  const path = require('path');
  const fs = require('fs');
  const archiver = require('archiver');
  const { parseUrl } = require('url');
  const HttpsProxyAgent = require('https-proxy-agent');
  const { readdir, stat: fsStat } = require('fs-extra');
  const { promisify } = require('util');
  const stream = require('stream');
  const pipeline = promisify(stream.pipeline);

  const getAgent = () => {
    // Use HTTPS Proxy (Optional)
    const proxy =
      process.env.proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy ||
      process.env.HTTPS_PROXY ||
      process.env.https_proxy;

    const agentOptions = {};
    if (proxy) {
      Object.assign(agentOptions, parseUrl(proxy));
    }

    const ca = process.env.ca || process.env.HTTPS_CA || process.env.https_ca;

    let caCerts = [];

    if (ca) {
      // Can be a single certificate or multiple, comma separated.
      const caArr = ca.split(',');
      // Replace the newline -- https://stackoverflow.com/questions/30400341
      caCerts = caCerts.concat(caArr.map((cert) => cert.replace(/\\n/g, '\n')));
    }

    const cafile = process.env.cafile || process.env.HTTPS_CAFILE || process.env.https_cafile;

    if (cafile) {
      // Can be a single certificate file path or multiple paths, comma separated.
      const caPathArr = cafile.split(',');
      caCerts = caCerts.concat(caPathArr.map((cafilePath) => fs.readFileSync(cafilePath.trim())));
    }

    if (caCerts.length > 0) {
      Object.assign(agentOptions, {
        rejectUnauthorized: true,
        ca: caCerts,
      });
    }

    if (proxy) {
      return new HttpsProxyAgent(agentOptions);
    } else if (agentOptions.ca) {
      return new https.Agent(agentOptions);
    }
    return undefined;
  };

  /**
   * Get the size of a directory
   * @param {string} p path to directory
   */
  const getDirSize = async (p) => {
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      return stat.size;
    } else if (stat.isDirectory()) {
      const entries = fs.readdirSync(p);
      return Promise.all(entries.map((e) => getDirSize(path.join(p, e)))).then((e) =>
        e.reduce((a, c) => a + c, 0)
      );
    }
    return 0;
    // can't take size of a stream/symlink/socket/etc
  };

  const readFiles = async (input, exclude = []) => {
    const inputPath = path.resolve(input);
    const base = path.resolve(process.cwd(), input);
    const files = [];
    let totalSize = 0;

    const readDir = async (dir) => {
      const items = await readdir(dir);
      itemIteration: for (const item of items) {
        const itemPath = path.resolve(dir, item);
        const relativeItemPath = path.relative(base, itemPath);

        for (const excludeItem of exclude) {
          if (minimatch(relativeItemPath, excludeItem, { nocase: true, dot: true })) {
            continue itemIteration;
          }
        }
        try {
          const fsItem = await fsStat(itemPath);
          if (fsItem.isDirectory()) {
            await readDir(itemPath);
          } else {
            totalSize += fsItem.size;
            files.push({ path: relativeItemPath, mode: fsItem.mode });
          }
        } catch (e) {
          console.log(`Can not read dir for ${dir}:${e.message}`);
        }
      }
    };

    await readDir(inputPath);

    return { files, totalSize };
  };

  const readableByte = (bytes) => {
    if (bytes < 1000) {
      return `${bytes}b`;
    }
    const exp = Math.log(bytes) / Math.log(1000);
    const unit = 'KMGTP'.charAt(Math.floor(exp - 1));
    const size = (bytes / Math.pow(1000, Math.floor(exp))).toFixed(1);
    return `${size}${unit}`;
  };

  const readIncludeFiles = async (input, include = []) => {
    const base = path.resolve(process.cwd(), input);

    const files = [];
    let totalSize = 0;

    const pathNormalize = (filePath, prefix) => {
      if (!filePath || !prefix) {
        return filePath;
      }
      const pathArr = path.normalize(filePath).split('/');
      // normalize for the prefix path
      // vendor/../abc/t.js -> abc/t.js
      return path.normalize(`${pathArr[0]}/${prefix}/${pathArr.slice(1).join('/')}`);
    };

    const readDir = async (dir, prefix = './') => {
      const items = await readdir(dir);
      for (const item of items) {
        const itemPath = path.resolve(dir, item);
        const relativeItemPath = path.relative(base, itemPath);

        const fsItem = await fsStat(itemPath);
        if (fsItem.isDirectory()) {
          await readDir(itemPath, prefix);
        } else {
          totalSize += fsItem.size;
          files.push({
            path: relativeItemPath,
            name: pathNormalize(relativeItemPath, prefix),
            mode: fsItem.mode,
          });
        }
      }
    };

    include = include.map((item) => {
      return typeof item === 'string'
        ? {
            source: item,
          }
        : item;
    });

    for (const includeItem of include) {
      const relativeItemPath = path.resolve(base, includeItem.source);
      const fsItem = await fsStat(relativeItemPath);
      if (fsItem.isDirectory()) {
        await readDir(relativeItemPath, includeItem.prefix);
      } else {
        totalSize += fsItem.size;
        files.push({
          path: relativeItemPath,
          name: pathNormalize(includeItem.source, includeItem.prefix),
        });
      }
    }
    return { files, totalSize };
  };

  const zipAndUpload = async (
    inputDirPath,
    inputContents,
    exclude,
    include,
    targetUploadUrl,
    options = {}
  ) => {
    let resolveUpload = null;
    let rejectUpload = null;
    const res = new Promise((resolve, reject) => {
      resolveUpload = resolve;
      rejectUpload = reject;
    });
    const url = urlUtils.parse(targetUploadUrl);
    const req = https.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.path,
      method: 'PUT',
    });
    const archive = archiver('zip');
    const { files, totalSize } = await readFiles(inputDirPath, exclude);
    const { files: includeFiles, totalSize: includeSize } = await readIncludeFiles(
      inputDirPath,
      include
    );
    const { statusReceiver: statusReporter, targetDir } = options;

    // After upload request really send all data, we then resolve the outside promise to continue the process
    req.on('response', () => resolveUpload && resolveUpload());
    // Reject error when upload content
    req.on('error', (err) => {
      console.log(`ZipAndUpload error:${err.message}`);
      rejectUpload(err);
    });

    if (statusReporter) {
      statusReporter('Uploading');
      let reportingInterval;
      const finishReporting = () => {
        statusReporter();
        if (reportingInterval) {
          clearInterval(reportingInterval);
        }
      };
      // report progress if uploading more than 10mb code
      if (totalSize + includeSize > 10 * 1024 * 1024) {
        const startTime = Date.now();
        reportingInterval = setInterval(
          () => {
            const bytesWritten = req.connection.bytesWritten;
            const timeElapse = Date.now() - startTime;
            statusReporter(
              `Uploading ${readableByte(bytesWritten)} ${readableByte(
                (bytesWritten / timeElapse) * 1000
              )}/s`
            );
          },
          // in debug mode, we output plain console logs into CLI
          // so we don't want output too many lines of uploading progress log into CLI.
          options.debug ? 10000 : 200
        );
      }
      // clear status when stream end
      archive.on('end', finishReporting);
      archive.on('close', finishReporting);
    }

    const uploadPromise = pipeline(archive, req);

    // zip input dir
    for (const file of files) {
      archive.append(fs.createReadStream(path.resolve(inputDirPath, file.path)), {
        name: targetDir ? path.join(targetDir, file.path) : file.path,
        mode: file.mode,
      });
      await sleep(0);
    }

    // zip include files
    for (const file of includeFiles) {
      archive.append(fs.createReadStream(path.resolve(inputDirPath, file.path)), {
        name: targetDir ? path.join(targetDir, file.name) : file.name,
        mode: file.mode,
      });
      await sleep(0);
    }

    // zip input contents
    if (inputContents) {
      for (const [fileName, fileContent] of Object.entries(inputContents)) {
        archive.append(fileContent, {
          name: targetDir ? path.join(targetDir, fileName) : fileName,
        });
      }
    }

    archive.finalize();

    try {
      await uploadPromise;
    } catch (e) {
      const error = new Error(
        `Failed to upload your code${
          e.code ? `(${e.code})` : ''
        }, check your network setting and try again.`
      );
      error.code = e.code;
      throw error;
    }
    return res;
  };

  const isChinaUser = () => {
    const chinaUserDetector = new TencentUtils.IsInChina();
    const { IsInChina: result } = chinaUserDetector.inChina();
    return result;
  };

  const useGlobalStore = () => {
    const envChceker = new TencentUtils.Environment();
    return envChceker.useGlobalStore();
  };

  const loginWithTencent = async () => {
    let isLoggedIn = false;
    if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
      try {
        await getOrgId();
        isLoggedIn = true;
      } catch (e) {
        if (e.code === 'AuthFailure.TokenFailure') {
          // token expired, re-login
          isLoggedIn = false;
        } else {
          throw e;
        }
      }
    }
    if (!isLoggedIn) {
      const tencentAuth = new TencentAuth();
      const credentials = await tencentAuth.login();
      if (!credentials) {
        throw new Error('failed to log into Tencent cloud');
      }
      return [true, credentials];
    }
    return [false, null];
  };

  const getOrgId = async (credential = {}) => {
    const { SecretId, SecretKey, Token } = credential;
    const userInfoGetter = new TencentCAM.GetUserInformation();
    const { AppId: orgId } = await userInfoGetter.getUserInformation({
      SecretId: SecretId || process.env.TENCENT_SECRET_ID,
      SecretKey: SecretKey || process.env.TENCENT_SECRET_KEY,
      token: Token || process.env.TENCENT_TOKEN,
    });
    return String(orgId);
  };

  const tencentDebug = {};
  const getTencentDebug = (functionInfo, region) => {
    const funInfo =
      typeof functionInfo === 'string' ? { functionName: functionInfo } : { ...functionInfo };
    // remove unnecessary key
    delete funInfo.runtime;
    const key = `${funInfo.functionName}-${region}`;
    if (!tencentDebug[key]) {
      const auth = {
        SecretId: process.env.TENCENT_SECRET_ID,
        SecretKey: process.env.TENCENT_SECRET_KEY,
        token: process.env.TENCENT_TOKEN,
      };
      if (doesRuntimeSupportDebug(functionInfo.runtime)) {
        tencentDebug[key] = new TencentDebug(auth, funInfo, region);
      } else {
        tencentDebug[key] = {
          logAddr: TencentLog.ScfRealTimeLogs.getAddr(auth, funInfo, region),
        };
      }
    }
    return tencentDebug[key];
  };

  const resetGlobalAgent = () => {
    const httpGlobalAgent = http.globalAgent;
    const httpsGlobalAgent = https.globalAgent;
    if (http.defaultGlobalAgent) {
      http.globalAgent = http.defaultGlobalAgent;
    }
    if (https.defaultGlobalAgent) {
      https.globalAgent = https.defaultGlobalAgent;
    }
    return () => {
      if (http.defaultGlobalAgent) {
        http.globalAgent = httpGlobalAgent;
      }
      if (https.defaultGlobalAgent) {
        https.globalAgent = httpsGlobalAgent;
      }
    };
  };

  const doesRuntimeSupportDebug = (runtime) => {
    const normalizedRunTime = runtime.toLowerCase().trim();
    if (normalizedRunTime.startsWith('nodejs')) {
      const version = parseFloat(normalizedRunTime.replace('nodejs', ''));
      if (version >= 10.15) {
        return true;
      }
    }
    return false;
  };

  const startTencentRemoteLogAndDebug = async (functionInfo, region, cliCallback) => {
    // remove any preset globalAgent and reset them back after calling tencent debug mode
    // since tencent API will handle proxy internally.
    const restoreRequestAgent = resetGlobalAgent();
    const tencentDebuggger = getTencentDebug(functionInfo, region);
    if (doesRuntimeSupportDebug(functionInfo.runtime)) {
      await tencentDebuggger.remoteDebug(cliCallback);
      tencentDebuggger.stopAll = async () => {
        return tencentDebuggger.stop(cliCallback);
      };
    } else {
      const ws = new WebSocket(tencentDebuggger.logAddr);
      ws.on('open', () => {
        cliCallback('--------------------- The realtime log ---------------------');
      });
      ws.on('message', (msg) => {
        cliCallback(msg);
      });
      tencentDebuggger.stopAll = async () => {
        ws.close();
      };
    }
    restoreRequestAgent();
  };

  const stopTencentRemoteLogAndDebug = async (functionInfo, region) => {
    // remove any preset globalAgent and reset them back after calling tencent debug mode
    // since tencent API will handle proxy internally.
    const restoreRequestAgent = resetGlobalAgent();
    const tencentDebuggger = getTencentDebug(functionInfo, region);
    if (tencentDebuggger.stopAll) {
      await tencentDebuggger.stopAll();
    }
    restoreRequestAgent();
  };

  const buildTempAccessKeyForTencent = (credentials) => {
    let accessKey;
    if (credentials.Token) {
      accessKey = `${encodeURIComponent(credentials.SecretId)}:${encodeURIComponent(
        credentials.SecretKey
      )}:${encodeURIComponent(credentials.Token)}`;
    } else {
      accessKey = `${encodeURIComponent(credentials.SecretId)}:${encodeURIComponent(
        credentials.SecretKey
      )}`;
    }
    return encodeURIComponent(accessKey);
  };

  const parseCredentialFromTempAccessKey = (key) => {
    const decodedKey = decodeURIComponent(key);
    const parts = decodedKey.split(':');
    if (parts.length >= 2) {
      return {
        SecretId: decodeURIComponent(parts[0]),
        SecretKey: decodeURIComponent(parts[1]),
        Token: parts[2] ? decodeURIComponent(parts[2]) : null,
      };
    }
    return {};
  };

  // Add to utils object
  utils.getAgent = getAgent;
  utils.getDirSize = getDirSize;
  utils.zipAndUpload = zipAndUpload;
  utils.isChinaUser = isChinaUser;
  utils.useGlobalStore = useGlobalStore;
  utils.loginWithTencent = loginWithTencent;
  utils.getOrgId = getOrgId;
  utils.startTencentRemoteLogAndDebug = startTencentRemoteLogAndDebug;
  utils.stopTencentRemoteLogAndDebug = stopTencentRemoteLogAndDebug;
  utils.buildTempAccessKeyForTencent = buildTempAccessKeyForTencent;
  utils.parseCredentialFromTempAccessKey = parseCredentialFromTempAccessKey;

// Export
module.exports = utils;
