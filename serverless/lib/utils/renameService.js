'use strict';

const path = require('path');
const fse = require('fs-extra');

const fileExistsSync = require('./fs/fileExistsSync');
const readFileSync = require('./fs/readFileSync');
const writeFileSync = require('./fs/writeFileSync');
const ServerlessError = require('../serverless-error');

function renameYmlService(name, ymlServiceFile) {
  const serverlessYml = fse
    .readFileSync(ymlServiceFile, 'utf-8')
    .replace(/(^|\s|#)service\s*:.+/, (ignore, prefix) => `${prefix}service: ${name}`)
    .replace(
      /(^|\s|#)service\s*:\s*\n(\s+)name:.+/,
      (match, prefix, indent) => `${prefix}service:\n${indent}name: ${name}`
    );

  fse.writeFileSync(ymlServiceFile, serverlessYml);
}

function renameTsService(name, tsServicefile) {
  const serverlessTs = fse
    .readFileSync(tsServicefile, 'utf-8')
    .replace(/(^|\s)service\s*:\s*('|").+('|")/, (ignore, prefix) => `${prefix}service: '${name}'`)
    .replace(
      /(^|\s)service\s*:\s*{\s*\n(\s+)name:\s*('|").+('|")/,
      (match, prefix, indent) => `${prefix}service: {\n${indent}name: '${name}'`
    );

  fse.writeFileSync(tsServicefile, serverlessTs);
}

function renameService(name, servicePath) {
  const packageFile = path.join(servicePath, 'package.json');
  if (fileExistsSync(packageFile)) {
    const json = readFileSync(packageFile);
    writeFileSync(packageFile, Object.assign(json, { name }));
  }
  const packageLockFile = path.join(servicePath, 'package-lock.json');
  if (fileExistsSync(packageLockFile)) {
    const json = readFileSync(packageLockFile);
    writeFileSync(packageLockFile, Object.assign(json, { name }));
  }

  const ymlServiceFile = path.join(servicePath, 'serverless.yml');
  if (fileExistsSync(ymlServiceFile)) {
    renameYmlService(name, ymlServiceFile);
    return name;
  }

  const tsServiceFile = path.join(servicePath, 'serverless.ts');
  if (fileExistsSync(tsServiceFile)) {
    renameTsService(name, tsServiceFile);
    return name;
  }

  const errorMessage = ['serverless.yml or serverlss.ts not found in', ` ${servicePath}`].join('');
  throw new ServerlessError(errorMessage);
}

module.exports.renameService = renameService;
