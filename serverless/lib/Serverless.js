'use strict';

const path = require('path');
const _ = require('lodash');
const os = require('os');
const fileExists = require('./utils/fs/fileExists');
const ensureString = require('type/string/ensure');
const CLI = require('./classes/CLI');
const Config = require('./classes/Config');
const YamlParser = require('./classes/YamlParser');
const PluginManager = require('./classes/PluginManager');
const Utils = require('./classes/Utils');
const Service = require('./classes/Service');
const Variables = require('./classes/Variables');
const ConfigSchemaHandler = require('./classes/ConfigSchemaHandler');
const ServerlessError = require('./serverless-error');
const version = require('./../package.json').version;
const isStandaloneExecutable = require('./utils/isStandaloneExecutable');
const resolveConfigurationPathSync = require('./legacy/resolve-configuration-path-sync');
const logDeprecation = require('./utils/logDeprecation');
const eventuallyUpdate = require('./utils/eventuallyUpdate');
const resolveLocalServerlessPath = require('./cli/resolve-local-serverless-path');
const loadEnv = require('./loadEnv');

class Serverless {
  constructor(config) {
    let configObject = config;
    configObject = configObject || {};
    this.configurationPath = ensureString(configObject.configurationPath, {
      isOptional: true,
      name: 'config.configurationPath',
    });
    if (this.configurationPath) {
      this.configurationPath = path.resolve(this.configurationPath);
    } else if (configObject.configurationPath === undefined) {
      this.configurationPath = resolveConfigurationPathSync();
      if (this.configurationPath) {
        this._logDeprecation(
          'MISSING_SERVICE_CONFIGURATION_PATH',
          'Serverless constructor expects resolved service configuration path to be provided ' +
            'via "config.configurationPath".\n' +
            'Starting from next major Serverless will no longer auto resolve that path internally.'
        );
      }
    }

    this.providers = {};

    this.version = version;

    this.yamlParser = new YamlParser(this);
    this.utils = new Utils(this);
    this.service = new Service(this);
    this.variables = new Variables(this);
    this.pluginManager = new PluginManager(this);
    this.configSchemaHandler = new ConfigSchemaHandler(this);

    // use the servicePath from the options or try to find it in the CWD
    this.cliInputArgv = process.argv.slice(2);
    if (this.configurationPath) {
      configObject.servicePath = path.dirname(this.configurationPath);
    }

    this.config = new Config(this, configObject);

    this.classes = {};
    this.classes.CLI = CLI;
    this.classes.YamlParser = YamlParser;
    this.classes.Utils = Utils;
    this.classes.Service = Service;
    this.classes.Variables = Variables;
    this.classes.Error = ServerlessError;
    this.classes.PluginManager = PluginManager;
    this.classes.ConfigSchemaHandler = ConfigSchemaHandler;

    this.serverlessDirPath = path.join(os.homedir(), '.serverless');
    this.isStandaloneExecutable = isStandaloneExecutable;
    this.isLocallyInstalled = false;
    this.isInvokedByGlobalInstallation = false;
    this.triggeredDeprecations = logDeprecation.triggeredDeprecations;
  }

  init() {
    // create an instanceId (can be e.g. used when a predictable random value is needed)
    this.instanceId = new Date().getTime().toString();

    // create a new CLI instance
    this.cli = new this.classes.CLI(this, this.cliInputArgv);

    // get an array of commands and options that should be processed
    this.processedInput = this.cli.processInput();

    // load config file
    return this.pluginManager
      .loadConfigFile()
      .then(() => this.eventuallyFallbackToLocal())
      .then(() => {
        if (this.isOverridenByLocal) return null;
        eventuallyUpdate(this);
        // set the options and commands which were processed by the CLI
        this.pluginManager.setCliOptions(this.processedInput.options);
        this.pluginManager.setCliCommands(this.processedInput.commands);

        return this.loadEnvVariables()
          .then(() => this.service.load(this.processedInput.options))
          .then(() => {
            // load all plugins
            return this.pluginManager.loadAllPlugins(this.service.plugins);
          })
          .then(() => {
            // give the CLI the plugins and commands so that it can print out
            // information such as options when the user enters --help
            this.cli.setLoadedPlugins(this.pluginManager.getPlugins());
            this.cli.setLoadedCommands(this.pluginManager.getCommands());
            return this.pluginManager.updateAutocompleteCacheFile();
          });
      });
  }
  async eventuallyFallbackToLocal() {
    if (
      this.pluginManager.serverlessConfigFile &&
      this.pluginManager.serverlessConfigFile.enableLocalInstallationFallback != null
    ) {
      this._logDeprecation(
        'DISABLE_LOCAL_INSTALLATION_FALLBACK_SETTING',
        'Starting with next major version, "enableLocalInstallationFallback" setting will no longer be supported.' +
          'CLI will unconditionally fallback to service local installation when its found.\n' +
          'Remove this setting to clear this deprecation warning'
      );
    }
    if (this.isLocallyInstalled) return;
    const localServerlessPath = await resolveLocalServerlessPath();
    if (!localServerlessPath) return;
    if (localServerlessPath === __filename) {
      this.isLocallyInstalled = true;
      return;
    }
    if (
      this.pluginManager.serverlessConfigFile &&
      this.pluginManager.serverlessConfigFile.enableLocalInstallationFallback != null &&
      !this.pluginManager.serverlessConfigFile.enableLocalInstallationFallback
    ) {
      return;
    }
    this.cli.log('Running "serverless" installed locally (in service node_modules)');
    // TODO: Replace below fallback logic with more straightforward one at top of the CLI
    // when we willl drop support for the "disableLocalInstallationFallback" setting
    this.isOverridenByLocal = true;
    const ServerlessLocal = require(localServerlessPath);
    const serverlessLocal = new ServerlessLocal({ configurationPath: this.configurationPath });
    serverlessLocal.isLocallyInstalled = true;
    serverlessLocal.isInvokedByGlobalInstallation = true;
    this.invokedInstance = serverlessLocal;
    await serverlessLocal.init();
  }

  async loadEnvVariables() {
    const serverlessConfigFile = this.pluginManager.serverlessConfigFile;
    if (serverlessConfigFile == null) return;

    const stage =
      this.processedInput.options.stage ||
      this.processedInput.options.s ||
      _.get(serverlessConfigFile, 'provider.stage', 'dev');

    if (serverlessConfigFile.useDotenv) {
      await loadEnv(stage);
    } else {
      const defaultEnvFilePath = path.join(process.cwd(), '.env');
      const stageEnvFilePath = path.join(process.cwd(), `.env.${stage}`);

      const [doesStageEnvFileExists, doesDefaultEnvFileExists] = await Promise.all([
        fileExists(stageEnvFilePath),
        fileExists(defaultEnvFilePath),
      ]);

      if (doesDefaultEnvFileExists || doesStageEnvFileExists) {
        this._logDeprecation(
          'LOAD_VARIABLES_FROM_ENV_FILES',
          'Detected ".env" files. Note that Framework now supports loading variables from those files ' +
            'when "useDotenv: true" is set (and that will be the default from next major release)'
        );
      }
    }
  }

  async run() {
    if (this.cli.displayHelp(this.processedInput)) {
      return;
    }
    this.cli.suppressLogIfPrintCommand(this.processedInput);

    // make sure the command exists before doing anything else
    this.pluginManager.validateCommand(this.processedInput.commands);

    // populate variables after --help, otherwise help may fail to print
    // (https://github.com/serverless/serverless/issues/2041)
    await this.variables.populateService(this.pluginManager.cliOptions);

    // merge arrays after variables have been populated
    // (https://github.com/serverless/serverless/issues/3511)
    this.service.mergeArrays();

    // populate function names after variables are loaded in case functions were externalized
    // (https://github.com/serverless/serverless/issues/2997)
    this.service.setFunctionNames(this.processedInput.options);

    // If in context of service, validate the service configuration
    if (this.config.servicePath) this.service.validate();

    // trigger the plugin lifecycle when there's something which should be processed
    await this.pluginManager.run(this.processedInput.commands);
  }

  setProvider(name, provider) {
    this.providers[name] = provider;
  }

  getProvider(name) {
    return this.providers[name] ? this.providers[name] : false;
  }

  getVersion() {
    return this.version;
  }

  // Only for internal use
  _logDeprecation(code, message) {
    return logDeprecation(code, message, { serviceConfig: this.service });
  }

  // To be used by external plugins
  logDeprecation(code, message) {
    return this._logDeprecation(`EXT_${ensureString(code)}`, ensureString(message));
  }
}

module.exports = Serverless;
