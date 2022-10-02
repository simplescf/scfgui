'use strict';

const path = require('path');
const globby = require('globby');
const _ = require('lodash');
const micromatch = require('micromatch');

module.exports = {
  defaultExcludes: [
    '.git/**',
    '.gitignore',
    '.DS_Store',
    'npm-debug.log',
    'yarn-*.log',
    '.serverless/**',
    '.serverless_plugins/**',
  ],

  getIncludes(include) {
    const packageIncludes = this.serverless.service.package.include || [];
    return _.union(packageIncludes, include);
  },

  getRuntime(runtime) {
    const defaultRuntime = 'nodejs12.x';
    return runtime || this.serverless.service.provider.runtime || defaultRuntime;
  },

  getExcludes(exclude, excludeLayers) {
    const configFilePath = this.serverless.configurationPath;
    const packageExcludes = this.serverless.service.package.exclude || [];
    // add local service plugins Path
    const pluginsLocalPath = this.serverless.pluginManager.parsePluginsObject(
      this.serverless.service.plugins
    ).localPath;
    const localPathExcludes = pluginsLocalPath ? [pluginsLocalPath] : [];
    // add layer paths
    const layerExcludes = excludeLayers
      ? this.serverless.service
          .getAllLayers()
          .map((layer) => `${this.serverless.service.getLayer(layer).path}/**`)
      : [];
    // add defaults for exclude

    const serverlessConfigFileExclude = configFilePath ? [path.basename(configFilePath)] : [];

    const serverlessConfigFile = this.serverless.pluginManager.serverlessConfigFile;
    const envFilesExclude = serverlessConfigFile && serverlessConfigFile.useDotenv ? ['.env*'] : [];

    return _.union(
      this.defaultExcludes,
      serverlessConfigFileExclude,
      localPathExcludes,
      packageExcludes,
      layerExcludes,
      envFilesExclude,
      exclude
    );
  },

  async packageService() {
    this.serverless.cli.log('Packaging service...');
    let shouldPackageService = false;
    const allFunctions = this.serverless.service.getAllFunctions();
    let packagePromises = allFunctions.map(async (functionName) => {
      const functionObject = this.serverless.service.getFunction(functionName);
      if (functionObject.image) return;
      functionObject.package = functionObject.package || {};
      if (functionObject.package.disable) {
        this.serverless.cli.log(`Packaging disabled for function: "${functionName}"`);
        return;
      }
      if (functionObject.package.artifact) return;
      if (functionObject.package.individually || this.serverless.service.package.individually) {
        await this.packageFunction(functionName);
        return;
      }
      shouldPackageService = true;
    });
    const allLayers = this.serverless.service.getAllLayers();
    packagePromises = packagePromises.concat(
      allLayers.map(async (layerName) => {
        const layerObject = this.serverless.service.getLayer(layerName);
        layerObject.package = layerObject.package || {};
        if (layerObject.package.artifact) return;
        await this.packageLayer(layerName);
      })
    );

    await Promise.all(packagePromises);
    if (shouldPackageService && !this.serverless.service.package.artifact) await this.packageAll();
  },

  packageAll() {
    const zipFileName = `${this.serverless.service.service}.zip`;

    return this.resolveFilePathsAll().then((filePaths) =>
      this.zipFiles(filePaths, zipFileName).then((filePath) => {
        // only set the default artifact for backward-compatibility
        // when no explicit artifact is defined
        if (!this.serverless.service.package.artifact) {
          this.serverless.service.package.artifact = filePath;
          this.serverless.service.artifact = filePath;
        }
        return filePath;
      })
    );
  },

  async packageFunction(functionName) {
    const functionObject = this.serverless.service.getFunction(functionName);
    if (functionObject.image) return null;

    const funcPackageConfig = functionObject.package || {};

    // use the artifact in function config if provided
    if (funcPackageConfig.artifact) {
      const filePath = path.resolve(this.serverless.config.servicePath, funcPackageConfig.artifact);
      functionObject.package.artifact = filePath;
      return filePath;
    }

    // use the artifact in service config if provided
    // and if the function is not set to be packaged individually
    if (this.serverless.service.package.artifact && !funcPackageConfig.individually) {
      const filePath = path.resolve(
        this.serverless.config.servicePath,
        this.serverless.service.package.artifact
      );
      funcPackageConfig.artifact = filePath;

      return filePath;
    }

    const zipFileName = `${functionName}.zip`;

    const filePaths = await this.resolveFilePathsFunction(functionName);
    const artifactPath = await this.zipFiles(filePaths, zipFileName);
    funcPackageConfig.artifact = artifactPath;
    return artifactPath;
  },

  packageLayer(layerName) {
    const layerObject = this.serverless.service.getLayer(layerName);

    const zipFileName = `${layerName}.zip`;

    return this.resolveFilePathsLayer(layerName)
      .then((filePaths) => filePaths.map((f) => path.resolve(path.join(layerObject.path, f))))
      .then((filePaths) =>
        this.zipFiles(filePaths, zipFileName, path.resolve(layerObject.path)).then(
          (artifactPath) => {
            layerObject.package = {
              artifact: artifactPath,
            };
            return artifactPath;
          }
        )
      );
  },

  async resolveFilePathsAll() {
    return this.resolveFilePathsFromPatterns(
      await this.excludeDevDependencies({
        exclude: this.getExcludes([], true),
        include: this.getIncludes(),
      })
    );
  },

  async resolveFilePathsFunction(functionName) {
    const functionObject = this.serverless.service.getFunction(functionName);
    const funcPackageConfig = functionObject.package || {};

    return this.resolveFilePathsFromPatterns(
      await this.excludeDevDependencies({
        exclude: this.getExcludes(funcPackageConfig.exclude, true),
        include: this.getIncludes(funcPackageConfig.include),
      })
    );
  },

  async resolveFilePathsLayer(layerName) {
    const layerObject = this.serverless.service.getLayer(layerName);
    const layerPackageConfig = layerObject.package || {};

    return this.resolveFilePathsFromPatterns(
      await this.excludeDevDependencies({
        exclude: this.getExcludes(layerPackageConfig.exclude, false),
        include: this.getIncludes(layerPackageConfig.include),
      }),
      layerObject.path
    );
  },

  resolveFilePathsFromPatterns(params, prefix) {
    const patterns = [];

    params.exclude.forEach((pattern) => {
      if (pattern.charAt(0) !== '!') {
        patterns.push(`!${pattern}`);
      } else {
        patterns.push(pattern.substring(1));
      }
    });

    // push the include globs to the end of the array
    // (files and folders will be re-added again even if they were excluded beforehand)
    params.include.forEach((pattern) => {
      patterns.push(pattern);
    });

    // NOTE: please keep this order of concatenating the include params
    // rather than doing it the other way round!
    // see https://github.com/serverless/serverless/pull/5825 for more information
    return globby(['**'].concat(params.include), {
      cwd: path.join(this.serverless.config.servicePath, prefix || ''),
      dot: true,
      silent: true,
      follow: true,
      nodir: true,
      expandDirectories: false,
    }).then((allFilePaths) => {
      const filePathStates = allFilePaths.reduce((p, c) => Object.assign(p, { [c]: true }), {});
      patterns
        // micromatch only does / style path delimiters, so convert them if on windows
        .map((p) => {
          return process.platform === 'win32' ? p.replace(/\\/g, '/') : p;
        })
        .forEach((p) => {
          const exclude = p.startsWith('!');
          const pattern = exclude ? p.slice(1) : p;
          micromatch(allFilePaths, [pattern], { dot: true }).forEach((key) => {
            filePathStates[key] = !exclude;
          });
        });
      const filePaths = Object.entries(filePathStates)
        .filter((r) => r[1] === true)
        .map((r) => r[0]);
      if (filePaths.length !== 0) return filePaths;
      throw new this.serverless.classes.Error('No file matches include / exclude patterns');
    });
  },
};
