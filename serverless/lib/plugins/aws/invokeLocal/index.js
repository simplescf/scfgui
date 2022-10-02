'use strict';

const _ = require('lodash');
const os = require('os');
const fse = require('fs-extra');
const path = require('path');
const validate = require('../lib/validate');
const chalk = require('chalk');
const stdin = require('get-stdin');
const spawnExt = require('child-process-ext/spawn');
const { spawn } = require('child_process');
const inspect = require('util').inspect;
const download = require('download');
const { ensureDir } = require('fs-extra');
const cachedir = require('cachedir');
const decompress = require('decompress');
const { v4: uuidv4 } = require('uuid');
const dirExists = require('../../../utils/fs/dirExists');
const fileExists = require('../../../utils/fs/fileExists');
const isStandalone = require('../../../utils/isStandaloneExecutable');
const ensureArtifact = require('../../../utils/ensureArtifact');
const resolveCfImportValue = require('../utils/resolveCfImportValue');
const resolveCfRefValue = require('../utils/resolveCfRefValue');

const cachePath = path.join(cachedir('serverless'), 'invokeLocal');

const ensureRuntimeWrappers = isStandalone
  ? () =>
      ensureArtifact('runtimeWrappers/validationFile', async (artifactsPath) => {
        await fse.copy(
          path.resolve(__dirname, 'runtimeWrappers'),
          path.resolve(artifactsPath, 'runtimeWrappers')
        );
        return fse.ensureFile(path.resolve(artifactsPath, 'runtimeWrappers/validationFile'));
      })
  : () => Promise.resolve(__dirname);

class AwsInvokeLocal {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};
    this.provider = this.serverless.getProvider('aws');

    Object.assign(this, validate);

    this.hooks = {
      'before:invoke:local:loadEnvVars': async () => {
        await this.extendedValidate();
        await this.loadEnvVars();
      },
      'invoke:local:invoke': () => this.invokeLocal(),
    };
  }

  getRuntime() {
    return this.provider.getRuntime(this.options.functionObj.runtime);
  }

  async resolveRuntimeWrapperPath(filename) {
    const artifactsPath = await ensureRuntimeWrappers();
    return path.resolve(artifactsPath, 'runtimeWrappers', filename);
  }

  async validateFile(filePath, key) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.serverless.config.servicePath, filePath);

    const exists = await fileExists(absolutePath);

    if (!exists) {
      throw new this.serverless.classes.Error(
        `The file you provided does not exist: ${absolutePath}`
      );
    }
    if (absolutePath.endsWith('.js')) {
      // to support js - export as an input data
      this.options[key] = require(absolutePath); // eslint-disable-line global-require
      return;
    }
    const contents = await this.serverless.utils.readFile(absolutePath);
    this.options[key] = contents;
  }

  async extendedValidate() {
    this.validate();
    // validate function exists in service
    this.options.functionObj = this.serverless.service.getFunction(this.options.function);
    this.options.data = this.options.data || '';

    if (this.options.functionObj.image) {
      throw new this.serverless.classes.Error(
        'Local invocation of lambdas pointing AWS ECR images is not supported'
      );
    }
    if (this.options.contextPath) {
      await this.validateFile(this.options.contextPath, 'context');
    }

    if (!this.options.data) {
      if (this.options.path) {
        await this.validateFile(this.options.path, 'data');
      } else {
        try {
          this.options.data = await stdin();
        } catch {
          // continue if no stdin was provided
        }
      }
    }

    try {
      // unless asked to preserve raw input, attempt to parse any provided objects
      if (!this.options.raw) {
        if (this.options.data) {
          this.options.data = JSON.parse(this.options.data);
        }
        if (this.options.context) {
          this.options.context = JSON.parse(this.options.context);
        }
      }
    } catch (exception) {
      // do nothing if it's a simple string or object already
    }
  }

  getCredentialEnvVars() {
    const credentialEnvVars = {};
    const { credentials } = this.provider.getCredentials();
    if (credentials) {
      if (credentials.accessKeyId) {
        credentialEnvVars.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
      }
      if (credentials.secretAccessKey) {
        credentialEnvVars.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
      }
      if (credentials.sessionToken) {
        credentialEnvVars.AWS_SESSION_TOKEN = credentials.sessionToken;
      }
    }
    return credentialEnvVars;
  }

  getConfiguredEnvVars() {
    const providerEnvVars = this.serverless.service.provider.environment || {};
    const functionEnvVars = this.options.functionObj.environment || {};
    return _.merge(providerEnvVars, functionEnvVars);
  }

  async loadEnvVars() {
    const lambdaName = this.options.functionObj.name;
    const memorySize =
      Number(this.options.functionObj.memorySize) ||
      Number(this.serverless.service.provider.memorySize) ||
      1024;

    const lambdaDefaultEnvVars = {
      LANG: 'en_US.UTF-8',
      LD_LIBRARY_PATH:
        '/usr/local/lib64/node-v4.3.x/lib:/lib64:/usr/lib64:/var/runtime:/var/runtime/lib:/var/task:/var/task/lib', // eslint-disable-line max-len
      LAMBDA_TASK_ROOT: '/var/task',
      LAMBDA_RUNTIME_DIR: '/var/runtime',
      AWS_REGION: this.provider.getRegion(),
      AWS_DEFAULT_REGION: this.provider.getRegion(),
      AWS_LAMBDA_LOG_GROUP_NAME: this.provider.naming.getLogGroupName(lambdaName),
      AWS_LAMBDA_LOG_STREAM_NAME: '2016/12/02/[$LATEST]f77ff5e4026c45bda9a9ebcec6bc9cad',
      AWS_LAMBDA_FUNCTION_NAME: lambdaName,
      AWS_LAMBDA_FUNCTION_MEMORY_SIZE: memorySize,
      AWS_LAMBDA_FUNCTION_VERSION: '$LATEST',
      NODE_PATH: '/var/runtime:/var/task:/var/runtime/node_modules',
    };

    const credentialEnvVars = this.getCredentialEnvVars();

    // profile override from config
    const profileOverride = this.provider.getProfile();
    if (profileOverride) {
      lambdaDefaultEnvVars.AWS_PROFILE = profileOverride;
    }

    const configuredEnvVars = this.getConfiguredEnvVars();

    await Promise.all(
      Object.entries(configuredEnvVars).map(async ([name, value]) => {
        if (!_.isObject(value)) return;
        try {
          if (value['Fn::ImportValue']) {
            configuredEnvVars[name] = await resolveCfImportValue(
              this.provider,
              value['Fn::ImportValue']
            );
          } else if (value.Ref) {
            configuredEnvVars[name] = await resolveCfRefValue(this.provider, value.Ref);
          } else {
            throw new Error(`Unsupported format: ${inspect(value)}`);
          }
        } catch (error) {
          throw new this.serverless.classes.Error(
            `Could not resolve "${name}" environment variable: ${error.message}`
          );
        }
      })
    );

    _.merge(process.env, lambdaDefaultEnvVars, credentialEnvVars, configuredEnvVars);
  }

  invokeLocal() {
    const runtime = this.getRuntime();
    const handler = this.options.functionObj.handler;

    if (this.options.docker) {
      return this.invokeLocalDocker();
    }

    if (runtime.startsWith('nodejs')) {
      const handlerSeparatorIndex = handler.lastIndexOf('.');
      const handlerPath = handler.slice(0, handlerSeparatorIndex);
      const handlerName = handler.slice(handlerSeparatorIndex + 1);
      return this.invokeLocalNodeJs(
        handlerPath,
        handlerName,
        this.options.data,
        this.options.context
      );
    }

    if (['python2.7', 'python3.6', 'python3.7', 'python3.8'].includes(runtime)) {
      const handlerComponents = handler.split(/\./);
      const handlerPath = handlerComponents.slice(0, -1).join('.');
      const handlerName = handlerComponents.pop();
      return this.invokeLocalPython(
        process.platform === 'win32' ? 'python.exe' : runtime,
        handlerPath,
        handlerName,
        this.options.data,
        this.options.context
      );
    }

    if (['java8', 'java11'].includes(runtime)) {
      const className = handler.split('::')[0];
      const handlerName = handler.split('::')[1] || 'handleRequest';
      return this.invokeLocalJava(
        'java',
        className,
        handlerName,
        this.serverless.service.package.artifact,
        this.options.data,
        this.options.context
      );
    }

    if (['ruby2.5', 'ruby2.7'].includes(runtime)) {
      const handlerComponents = handler.split(/\./);
      const handlerPath = handlerComponents[0];
      const handlerName = handlerComponents.slice(1).join('.');
      return this.invokeLocalRuby(
        process.platform === 'win32' ? 'ruby.exe' : 'ruby',
        handlerPath,
        handlerName,
        this.options.data,
        this.options.context
      );
    }

    return this.invokeLocalDocker();
  }

  async checkDockerDaemonStatus() {
    try {
      return await spawnExt('docker', ['version']);
    } catch {
      throw new Error('Please start the Docker daemon to use the invoke local Docker integration.');
    }
  }

  async checkDockerImage(imageName) {
    const { stdoutBuffer } = await spawnExt('docker', ['images', '-q', imageName]);
    return Boolean(stdoutBuffer.toString().trim());
  }

  async pullDockerImage() {
    const runtime = this.getRuntime();

    this.serverless.cli.log('Downloading base Docker image...');
    return spawnExt('docker', [
      'pull',
      '--disable-content-trust=false',
      `lambci/lambda:${runtime}`,
    ]);
  }

  async getLayerPaths() {
    const layers = _.mapKeys(this.serverless.service.layers, (value, key) =>
      this.provider.naming.getLambdaLayerLogicalId(key)
    );

    return Promise.all(
      (this.options.functionObj.layers || this.serverless.service.provider.layers || []).map(
        async (layer) => {
          if (layer.Ref) {
            const targetLayer = layers[layer.Ref];

            if (targetLayer.path) {
              return targetLayer.path;
            }
            if (targetLayer.package && targetLayer.package.artifact) {
              const layerArtifactContentPath = path.join('.serverless', 'layers', layer.Ref);
              const exists = await dirExists(layerArtifactContentPath);
              if (exists) {
                return layerArtifactContentPath;
              }
              this.serverless.cli.log(`Unziping ${layer.Ref}...`);
              await decompress(targetLayer.package.artifact, layerArtifactContentPath);
              return layerArtifactContentPath;
            }
          }
          const arnParts = layer.split(':');
          const layerArn = arnParts.slice(0, -1).join(':');
          const layerVersion = Number(arnParts.slice(-1)[0]);
          const layerContentsPath = path.join('.serverless', 'layers', arnParts[6], arnParts[7]);
          const layerContentsCachePath = path.join(cachePath, 'layers', arnParts[6], arnParts[7]);

          const exists = await dirExists(layerContentsPath);

          if (!exists) {
            const cacheExists = await dirExists(layerContentsCachePath);
            if (!cacheExists) {
              this.serverless.cli.log(`Downloading layer ${layer}...`);
              await ensureDir(path.join(layerContentsCachePath));

              const layerInfo = await this.provider.request('Lambda', 'getLayerVersion', {
                LayerName: layerArn,
                VersionNumber: layerVersion,
              });

              await download(layerInfo.Content.Location, layerContentsCachePath, {
                extract: true,
              });
            }
          }
          await fse.copy(layerContentsCachePath, layerContentsPath);
          return layerContentsPath;
        }
      )
    );
  }

  getDockerImageName() {
    return `sls-docker-${this.getRuntime()}`;
  }

  async buildDockerImage(layerPaths) {
    const runtime = this.getRuntime();
    const imageName = this.getDockerImageName();

    let dockerFileContent = `FROM lambci/lambda:${runtime}`;
    for (const layerPath of layerPaths) {
      dockerFileContent += `\nADD --chown=sbx_user1051:495 ${
        os.platform() === 'win32' ? layerPath.replace(/\\/g, '/') : layerPath
      } /opt`;
    }

    const dockerfilePath = path.join('.serverless', 'invokeLocal', runtime, 'Dockerfile');
    const dockerfileCachePath = path.join(cachePath, 'dockerfiles', runtime, 'Dockerfile');

    if (await fileExists(dockerfileCachePath)) {
      const contents = await fse.readFile(dockerfileCachePath);

      if (contents.toString() === dockerFileContent) {
        if (await this.checkDockerImage(imageName)) return imageName;
      }
    }

    await Promise.all([
      ensureDir(path.join('.serverless', 'invokeLocal', runtime)),
      ensureDir(path.join(cachePath, 'dockerfiles', runtime)),
    ]);

    this.serverless.cli.log('Writing Dockerfile...');
    await Promise.all([
      fse.writeFile(dockerfilePath, dockerFileContent),
      fse.writeFile(dockerfileCachePath, dockerFileContent),
    ]);

    this.serverless.cli.log('Building Docker image...');
    try {
      await spawnExt('docker', [
        'build',
        '-t',
        imageName,
        `${this.serverless.config.servicePath}`,
        '-f',
        dockerfilePath,
      ]);
      return imageName;
    } catch (err) {
      if (err.stdBuffer) {
        process.stdout.write(err.stdBuffer);
      }
      throw new Error(`Failed to build docker image (exit code ${err.code}})`);
    }
  }

  async extractArtifact() {
    const artifact = _.get(
      this.options.functionObj,
      'package.artifact',
      _.get(this.serverless.service, 'package.artifact')
    );
    if (!artifact) {
      return this.serverless.config.servicePath;
    }
    const destination = path.join(
      this.serverless.config.servicePath,
      '.serverless',
      'invokeLocal',
      'artifact'
    );
    await decompress(artifact, destination);
    return destination;
  }

  getEnvVarsFromOptions() {
    // Get the env vars from command line options in the form of --env KEY=value
    const envVarsFromOptions = {};
    for (const envOption of [].concat(this.options.env || [])) {
      const [varName, ...varRest] = envOption.split('=');
      const varValue = varRest.join('=');
      envVarsFromOptions[varName] = varValue;
    }
    return envVarsFromOptions;
  }

  async ensurePackage() {
    if (this.options['skip-package']) {
      try {
        await fse.access(
          path.join(this.serverless.config.servicePath, '.serverless', 'serverless-state.json')
        );
        return;
      } catch {
        // Missing state file. Need to repackage.
      }
    }
    await this.serverless.pluginManager.spawn('package');
  }

  async invokeLocalDocker() {
    const handler = this.options.functionObj.handler;
    const runtime = this.getRuntime();

    await this.ensurePackage();
    await this.checkDockerDaemonStatus();
    const results = await Promise.all([
      this.checkDockerImage(`lambci/lambda:${runtime}`).then((exists) => {
        return exists ? {} : this.pullDockerImage();
      }),
      this.getLayerPaths().then((layerPaths) => this.buildDockerImage(layerPaths)),
      this.extractArtifact(),
    ]);
    const imageName = results[1];
    const artifactPath = results[2];

    const lambdaName = this.options.functionObj.name;
    const memorySize =
      Number(this.options.functionObj.memorySize) ||
      Number(this.serverless.service.provider.memorySize) ||
      1024;
    const lambdaDefaultEnvVars = {
      AWS_REGION: this.provider.getRegion(),
      AWS_DEFAULT_REGION: this.provider.getRegion(),
      AWS_LAMBDA_LOG_GROUP_NAME: this.provider.naming.getLogGroupName(lambdaName),
      AWS_LAMBDA_FUNCTION_NAME: lambdaName,
      AWS_LAMBDA_FUNCTION_MEMORY_SIZE: memorySize,
    };
    const credentialEnvVars = this.getCredentialEnvVars();
    const configuredEnvVars = this.getConfiguredEnvVars();
    const envVarsFromOptions = this.getEnvVarsFromOptions();
    const envVars = _.merge(
      lambdaDefaultEnvVars,
      credentialEnvVars,
      configuredEnvVars,
      envVarsFromOptions
    );
    const envVarsDockerArgs = _.flatMap(envVars, (value, key) => ['--env', `${key}=${value}`]);

    const dockerArgsFromOptions = this.getDockerArgsFromOptions();
    const dockerArgs = [
      'run',
      '--rm',
      '-v',
      `${artifactPath}:/var/task:ro,delegated`,
    ].concat(envVarsDockerArgs, dockerArgsFromOptions, [
      imageName,
      handler,
      JSON.stringify(this.options.data),
    ]);

    try {
      const { stdBuffer } = await spawnExt('docker', dockerArgs);
      if (stdBuffer) {
        process.stdout.write(stdBuffer);
      }
      return imageName;
    } catch (err) {
      if (err.stdBuffer) {
        process.stdout.write(err.stdBuffer);
      }
      throw new Error(`Failed to run docker for ${runtime} image (exit code ${err.code}})`);
    }
  }

  getDockerArgsFromOptions() {
    const dockerArgOptions = this.options['docker-arg'];
    return _.flatMap([].concat(dockerArgOptions || []), (dockerArgOption) => {
      const splitItems = dockerArgOption.split(' ');
      return [splitItems[0], splitItems.slice(1).join(' ')];
    });
  }

  async invokeLocalPython(runtime, handlerPath, handlerName, event, context) {
    const input = JSON.stringify({
      event: event || {},
      context: Object.assign(
        {
          name: this.options.functionObj.name,
          version: 'LATEST',
          logGroupName: this.provider.naming.getLogGroupName(this.options.functionObj.name),
          timeout:
            Number(this.options.functionObj.timeout) ||
            Number(this.serverless.service.provider.timeout) ||
            6,
        },
        context
      ),
    });

    if (process.env.VIRTUAL_ENV) {
      const runtimeDir = os.platform() === 'win32' ? 'Scripts' : 'bin';
      process.env.PATH = [
        path.join(process.env.VIRTUAL_ENV, runtimeDir),
        path.delimiter,
        process.env.PATH,
      ].join('');
    }

    const wrapperPath = await this.resolveRuntimeWrapperPath('invoke.py');

    return new Promise((resolve, reject) => {
      const python = spawn(
        runtime.split('.')[0],
        ['-u', wrapperPath, handlerPath, handlerName],
        { env: process.env },
        { shell: true }
      );
      python.stdout.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
      python.stderr.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
      python.on('close', () => resolve());
      let isRejected = false;
      python.on('error', (error) => {
        isRejected = true;
        reject(error);
      });

      process.nextTick(() => {
        if (isRejected) return; // Runtime not available
        python.stdin.write(input);
        python.stdin.end();
      });
    });
  }

  async callJavaBridge(artifactPath, className, handlerName, input) {
    const wrapperPath = await this.resolveRuntimeWrapperPath('java/target/invoke-bridge-1.0.1.jar');

    try {
      await fse.stat(artifactPath);
    } catch {
      throw new Error(`Artifact ${artifactPath} doesn't exists, please compile it first.`);
    }

    return new Promise((resolve, reject) => {
      const java = spawn(
        'java',
        [
          `-DartifactPath=${artifactPath}`,
          `-DclassName=${className}`,
          `-DhandlerName=${handlerName}`,
          '-jar',
          wrapperPath,
        ],
        { shell: true }
      );

      this.serverless.cli.log(
        [
          'In order to get human-readable output,',
          ' please implement "toString()" method of your "ApiGatewayResponse" object.',
        ].join('')
      );

      java.stdout.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
      java.stderr.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
      java.on('close', () => resolve());
      let isRejected = false;
      java.on('error', (error) => {
        isRejected = true;
        reject(error);
      });

      process.nextTick(() => {
        if (isRejected) return; // Runtime not available
        java.stdin.write(input);
        java.stdin.end();
      });
    });
  }

  async invokeLocalJava(runtime, className, handlerName, artifactPath, event, customContext) {
    const timeout =
      Number(this.options.functionObj.timeout) ||
      Number(this.serverless.service.provider.timeout) ||
      6;
    const context = {
      name: this.options.functionObj.name,
      version: 'LATEST',
      logGroupName: this.provider.naming.getLogGroupName(this.options.functionObj.name),
      timeout,
    };
    const input = JSON.stringify({
      event: event || {},
      context: customContext || context,
    });
    const javaBridgePath = await this.resolveRuntimeWrapperPath('java');
    const executablePath = path.join(javaBridgePath, 'target');

    await fse.stat(executablePath);

    try {
      return await this.callJavaBridge(artifactPath, className, handlerName, input);
    } catch (err) {
      return new Promise((resolve, reject) => {
        const mvn = spawn('mvn', ['package', '-f', path.join(javaBridgePath, 'pom.xml')], {
          shell: true,
        });

        this.serverless.cli.log('Building Java bridge, first invocation might take a bit longer.');

        mvn.stderr.on('data', (buf) =>
          this.serverless.cli.consoleLog(`mvn(stderr) - ${buf.toString()}`)
        );
        const chunk = [];
        if (process.env.SLS_DEBUG) {
          mvn.stdout.on('data', (buf) => chunk.push(buf));
        }

        let isRejected = false;
        mvn.on('error', (error) => {
          if (!isRejected) {
            isRejected = true;
            reject(error);
          }
        });

        mvn.on('exit', (code, signal) => {
          if (code === 0) {
            resolve(this.callJavaBridge(artifactPath, className, handlerName, input));
          } else if (!isRejected) {
            if (process.env.SLS_DEBUG) {
              chunk
                .map((elem) => elem.toString())
                .join('')
                .split(/\n/)
                .forEach((line) => {
                  this.serverless.cli.consoleLog(`mvn(stdout) - ${line}`);
                });
            }
            isRejected = true;
            reject(
              new Error(`Failed to build the Java bridge. exit code=${code} signal=${signal}`)
            );
          }
        });

        process.nextTick(() => {
          if (isRejected) return; // Runtime not available
          mvn.stdin.end();
        });
      });
    }
  }

  async invokeLocalRuby(runtime, handlerPath, handlerName, event, context) {
    const input = JSON.stringify({
      event: event || {},
      context,
    });

    const wrapperPath = await this.resolveRuntimeWrapperPath('invoke.rb');
    return new Promise((resolve, reject) => {
      const ruby = spawn(runtime, [wrapperPath, handlerPath, handlerName], {
        env: process.env,
        shell: true,
      });
      ruby.stdout.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
      ruby.stderr.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
      ruby.on('close', () => resolve());
      let isRejected = false;
      ruby.on('error', (error) => {
        isRejected = true;
        reject(error);
      });

      process.nextTick(() => {
        if (isRejected) return; // Runtime not available
        ruby.stdin.write(input);
        ruby.stdin.end();
      });
    });
  }

  async invokeLocalNodeJs(handlerPath, handlerName, event, customContext) {
    let lambda;
    let pathToHandler;
    let hasResponded = false;
    try {
      /*
       * we need require() here to load the handler from the file system
       * which the user has to supply by passing the function name
       */
      pathToHandler = path.join(
        this.serverless.config.servicePath,
        this.options.extraServicePath || '',
        handlerPath
      );
      const handlersContainer = require(// eslint-disable-line global-require
      pathToHandler);
      lambda = handlersContainer[handlerName];
    } catch (error) {
      this.serverless.cli.consoleLog(chalk.red(inspect(error)));
      throw new Error(`Exception encountered when loading ${pathToHandler}`);
    }

    function handleError(err) {
      let errorResult;
      if (err instanceof Error) {
        errorResult = {
          errorMessage: err.message,
          errorType: err.constructor.name,
          stackTrace: err.stack && err.stack.split('\n'),
        };
      } else {
        errorResult = {
          errorMessage: err,
        };
      }

      this.serverless.cli.consoleLog(chalk.red(JSON.stringify(errorResult, null, 4)));
      process.exitCode = 1;
    }

    function handleResult(result) {
      if (result instanceof Error) {
        handleError.call(this, result);
        return;
      } else if (result.headers && result.headers['Content-Type'] === 'application/json') {
        if (result.body) {
          try {
            Object.assign(result, {
              body: JSON.parse(result.body),
            });
          } catch (e) {
            throw new Error('Content-Type of response is application/json but body is not json');
          }
        }
      }

      this.serverless.cli.consoleLog(JSON.stringify(result, null, 4));
    }

    return new Promise((resolve) => {
      const callback = (err, result) => {
        if (!hasResponded) {
          hasResponded = true;
          if (err) {
            handleError.call(this, err);
          } else if (result) {
            handleResult.call(this, result);
          }
        }
        resolve();
      };

      const startTime = new Date();
      const timeout =
        Number(this.options.functionObj.timeout) ||
        Number(this.serverless.service.provider.timeout) ||
        6;
      let context = {
        awsRequestId: uuidv4(),
        invokeid: 'id',
        logGroupName: this.provider.naming.getLogGroupName(this.options.functionObj.name),
        logStreamName: '2015/09/22/[HEAD]13370a84ca4ed8b77c427af260',
        functionVersion: 'HEAD',
        isDefaultFunctionVersion: true,

        functionName: this.options.functionObj.name,
        memoryLimitInMB: '1024',

        succeed(result) {
          return callback(null, result);
        },
        fail(error) {
          return callback(error);
        },
        done(error, result) {
          return callback(error, result);
        },
        getRemainingTimeInMillis() {
          return Math.max(timeout * 1000 - (new Date().valueOf() - startTime.valueOf()), 0);
        },
      };

      if (customContext) {
        context = customContext;
      }

      const maybeThennable = lambda(event, context, callback);
      if (maybeThennable) {
        return Promise.resolve(maybeThennable).then(callback.bind(this, null), callback.bind(this));
      }

      return maybeThennable;
    });
  }
}

module.exports = AwsInvokeLocal;
