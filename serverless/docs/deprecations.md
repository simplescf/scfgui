<!--
title: Serverless Framework Deprecations
menuText: Deprecations
layout: Doc
-->

# Serverless Framework Deprecations

## How to disable specific deprecation logs

To disable specific deprecations set `SLS_DEPRECATION_DISABLE` environment variable. Setting `SLS_DEPRECATION_DISABLE=*` will disable all deprecations. If you want to disable specific deprecations set `SLS_DEPRECATION_DISABLE=CODE1,CODE2`. Alternatively, you can also use `disabledDeprecations` in your `serverless.yml` in the following manner:

```yml
service: myService
disabledDeprecations:
  - CODE_1 # To disable specific deprecation with code "CODE_1"
  - '*' # To disable all deprecation messages
```

<a name="NESTED_CUSTOM_CONFIGURATION_PATH'"><div>&nbsp;</div></a>

## Service configurations should not be nested in service sub directories

Deprecation code: `NESTED_CUSTOM_CONFIGURATION_PATH`

Service configuration in all cases should be put at root folder of a service.
All paths in this configuration are resolved against service directory, and it's also the case if configuration is nested in sub directory.

To avoid confusing behavior starting with v3.0.0 Framework will no longer permit to rely on configurations placed in sub directories

<a name="MISSING_SERVICE_CONFIGURATION_PATH'"><div>&nbsp;</div></a>

## `Serverless` constructor `config.configurationPath` requirement

Deprecation code: `MISSING_SERVICE_CONFIGURATION_PATH`

`Serverless` constructor was refactored to depend on service configuration path being resolved externally and passed to its constructor with `config.configurationPath`. Starting from v3.0.0 this path will not be resolved internally.

<a name="VARIABLES_ERROR_ON_UNRESOLVED"><div>&nbsp;</div></a>

## Erroring on unresolved variable references

Deprecation code: `VARIABLES_ERROR_ON_UNRESOLVED`

Starting with v3.0.0, references to variables that cannot be resolved will result in an error being thrown.

Adapt to this behaviour now by adding `unresolvedVariablesNotificationMode: error` to service configuration.

<a name="AWS_API_GATEWAY_SPECIFIC_KEYS"><div>&nbsp;</div></a>

## API Gateway specific configuration

Deprecation code: `AWS_API_GATEWAY_SPECIFIC_KEYS`

Please use `provider.apiGateway.apiKeys` instead of `provider.apiKeys`.
Please use `provider.apiGateway.resourcePolicy` instead of `provider.resourcePolicy`.
Please use `provider.apiGateway.usagePlan` instead of `provider.usagePlan`.

Starting with v3.0.0, API Gateway-specific configuration keys `apiKeys`, `resourcePolicy` and `usagePlan` will be relocated from `provider` to `provider.apiGateway`.

<a name="PARAMETERIZED_ARGUMENT"><div>&nbsp;</div></a>

## Parameterized `org`, `app`, `service`, `stage`, and `region` usage

Org, app, service, stage, and region are required to resolve variables when logged in, variable resolution will not function without plaintext value. You may override values in `serverless.yml` for `stage` and `region` with command line arguments `--stage` and `--region`. The rest must be plain text.

<a name="LAMBDA_HASHING_VERSION_V2"><div>&nbsp;</div></a>

## Default `provider.lambdaHashingVersion`

Deprecation code: `LAMBDA_HASHING_VERSION_V2`

Starting with v3.0.0, the default value of `lambdaHashingVersion` will be equal to `20201221`. You can adapt to this behavior now, by setting `provider.lambdaHashingVersion` to `20201221`.

When trying to `sls deploy` for the first time after migration to new `lambdaHashingVersion`, you might encounter an error, similar to the one below:

```
  Serverless Error ---------------------------------------

  An error occurred: FooLambdaVersion3IV5NZ3sE5T2UFimCOai2Tc6eCaW7yIYOP786U0Oc - A version for this Lambda function exists ( 11 ). Modify the function to create a new version..
```

It is an expected behavior, to avoid it, you need to modify your function(s) code and try to redeploy it again. One common approach is to modify an utility function that is used by all/most of your Lambda functions.

<a name="LOAD_VARIABLES_FROM_ENV_FILES"><div>&nbsp;</div></a>

## Automatic loading environment variables from .env and .env.{stage} files

Deprecation code: `LOAD_VARIABLES_FROM_ENV_FILES`

Starting with v3.0.0, environment variables will be automatically loaded from `.env` and `.env.{stage}` files if they're present. In addition, `.env` files will be excluded from package in order to avoid uploading sensitive data as a part of the package by mistake.

Adapt to this behavior now by adding `useDotenv: true` to service configuration.

Note that env vars are handled differently than with [serverless-dotenv-plugin](https://github.com/colynb/serverless-dotenv-plugin), check [documentation](/framework/docs/environment-variables/) for more info.

<a name="SERVICE_OBJECT_NOTATION"><div>&nbsp;</div></a>

## `service` property object notation

Deprecation code: `SERVICE_OBJECT_NOTATION`

Starting with v3.0.0, object notation for `service` property will no longer be recognized. Set `service` property directly with service name.

<a name="CLOUDFRONT_CACHE_BEHAVIOR_FORWARDED_VALUES_AND_TTL"><div>&nbsp;</div></a>

## `cloudFront` event `behavior.ForwardedValues` property

Deprecation code: `CLOUDFRONT_CACHE_BEHAVIOR_FORWARDED_VALUES_AND_TTL`

[Cloudfront cache behavior `ForwardedValues`, `MinTTL`, `MaxTTL` and `DefaultTTL` fields are deprecated](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-distributionconfig.html). We recommend that you use a cache policy instead of this field. Please follow [cache policy documentation](/framework/docs/providers/aws/events/cloudfront.md) for implementation details.

<a name="AWS_API_GATEWAY_NAME_STARTING_WITH_SERVICE"><div>&nbsp;</div></a>

## API Gateway naming will be changed to `${service}-${stage}`

Deprecation code: `AWS_API_GATEWAY_NAME_STARTING_WITH_SERVICE`

Starting with v3.0.0, API Gateway naming will be changed from `${stage}-${service}` to `${service}-${stage}`.

Adapt to this convention now by setting `provider.apiGateway.shouldStartNameWithService` to `true`.

Eventually if you have a strong reason to stick to current convention, you may ensure it's kept after upgrading by setting: `provider.apiName: ${opt:stage, self:provider.stage, 'dev'}`

<a name="ALEXA_SKILL_EVENT_WITHOUT_APP_ID"><div>&nbsp;</div></a>

## Support for `alexaSkill` event without `appId` is to be removed

Deprecation code: `ALEXA_SKILL_EVENT_WITHOUT_APP_ID`

Starting with v3.0.0, support for `alexaSkill` event without `appId` provided will be removed.

<a name="AWS_KMS_KEY_ARN"><div>&nbsp;</div></a>

## `awsKmsKeyArn` references

Deprecation code: `AWS_KMS_KEY_ARN`

Please use `provider.kmsKeyArn` and `functions[].kmsKeyArn`. `service.awsKmsKeyArn` and `functions[].awsKmsKeyArn` will be removed with v3.0.0

<a name="RESOURCES_EXTENSIONS_REFERENCE_TO_NONEXISTENT_RESOURCE"><div>&nbsp;</div></a>

## Defining extensions to nonexistent resources in `resources.extensions`

Deprecation code: `RESOURCES_EXTENSIONS_REFERENCE_TO_NONEXISTENT_RESOURCE`

Starting with v3.0.0, extensions to nonexistent resources in `resources.extensions` will throw an error instead of passing silently.

<a name="DISABLE_LOCAL_INSTALLATION_FALLBACK_SETTING"><div>&nbsp;</div></a>

## Support for `enableLocalInstallationFallback` setting is to be removed

Deprecation code: `DISABLE_LOCAL_INSTALLATION_FALLBACK_SETTING`

Starting with v3.0.0, framework will unconditionally run service local installation of `serverless` if it's found.

<a name="LOCAL_INSTALLATION_FALLBACK"><div>&nbsp;</div></a>

## Fallback to a service local `serverless` installation

Deprecation code: `LOCAL_INSTALLATION_FALLBACK`

Starting with v2.0.0, globally installed CLI will by default run (fallback to) service local installation of `serverless` if it's found.

Adapt to this behavior now by adding `enableLocalInstallationFallback: true` to service configuration. Alternatively you may opt-out by setting it to `false` (note that'll be ineffective starting from v3.0.0, where support for this setting will be dropped, and CLI will unconditionally favor locally installed `serverless` installations when found)

<a name="AWS_HTTP_API_TIMEOUT"><div>&nbsp;</div></a>

## AWS HTTP API `timeout`

Deprecation code: `AWS_HTTP_API_TIMEOUT`

`provider.httpApi.timeout` and `functions[].events[].httpApi.timeout` settings will no longer be recognized with v2.0.0.

Endpoints are configured to automatically follow timeout setting as configured on functions (with extra margin needed to process HTTP request on AWS side)

<a name="SLSS_CLI_ALIAS"><div>&nbsp;</div></a>

## `slss` alias

Deprecation code: `SLSS_CLI_ALIAS`

Support for `slss` command will be removed with v2.0.0. Use `sls` or `serverless` instead.

<a name="AWS_FUNCTION_DESTINATIONS_ASYNC_CONFIG"><div>&nbsp;</div></a>

## AWS Lambda Function Destinations `maximumEventAge` & `maximumRetryAttempts`

Deprecation code: `AWS_FUNCTION_DESTINATIONS_ASYNC_CONFIG`

`maximumEventAge` and `maximumRetryAttempts` should be defined directly at function level. Support for those settings on `destinations` level, will be removed with v2.0.0

<a name="AWS_HTTP_API_VERSION"><div>&nbsp;</div></a>

## AWS HTTP API payload format

Deprecation code: `AWS_HTTP_API_VERSION`

Default HTTP API Payload version will be switched to 2.0 with next major release (For more details see [payload format documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format))

Configure `httpApi.payload` explicitly to ensure seamless migration.

<a name="OUTDATED_NODEJS"><div>&nbsp;</div></a>

## Outdated Node.js version

Deprecation code: `OUTDATED_NODEJS`

Support for Node.js v6 and v8 will be dropped with v2.0.0 release

Ensure to rely on at least Node.js v10 (It's recommended to use LTS version, as listed at https://nodejs.org/en/)

<a name="AWS_ALB_ALLOW_UNAUTHENTICATED"><div>&nbsp;</div></a>

## AWS ALB `allowUnauthenticated`

Deprecation code: `AWS_ALB_ALLOW_UNAUTHENTICATED`

Please use `onUnauthenticatedRequest` instead. `allowUnauthenticated` will be removed with v2.0.0

<a name="BIN_SERVERLESS"><div>&nbsp;</div></a>

## `bin/serverless`

Deprecation code: `BIN_SERVERLESS`

Please use `bin/serverless.js` instead. `bin/serverless` will be removed with v2.0.0
