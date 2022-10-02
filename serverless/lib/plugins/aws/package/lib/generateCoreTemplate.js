'use strict';

const path = require('path');
const _ = require('lodash');

module.exports = {
  async generateCoreTemplate() {
    this.serverless.service.provider.compiledCloudFormationTemplate = this.serverless.utils.readFileSync(
      path.join(
        this.serverless.config.serverlessPath,
        'plugins',
        'aws',
        'package',
        'lib',
        'core-cloudformation-template.json'
      )
    );

    const bucketName = this.serverless.service.provider.deploymentBucket;

    const deploymentBucketObject = this.serverless.service.provider.deploymentBucketObject;
    if (deploymentBucketObject && Object.keys(deploymentBucketObject).length) {
      const deploymentBucketLogicalId = this.provider.naming.getDeploymentBucketLogicalId();

      // resource tags support for deployment bucket
      if (deploymentBucketObject.tags && Object.keys(deploymentBucketObject.tags).length) {
        const tags = deploymentBucketObject.tags;

        const bucketTags = Object.keys(tags).map((key) => ({
          Key: key,
          Value: tags[key],
        }));

        Object.assign(
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[
            deploymentBucketLogicalId
          ].Properties,
          {
            Tags: bucketTags,
          }
        );
      }

      // enable S3 block public access for deployment bucket
      if (deploymentBucketObject.blockPublicAccess) {
        Object.assign(
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[
            deploymentBucketLogicalId
          ].Properties,
          {
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true,
            },
          }
        );
      }

      if (deploymentBucketObject.skipPolicySetup) {
        const deploymentBucketPolicyLogicalId = this.provider.naming.getDeploymentBucketPolicyLogicalId();
        delete this.serverless.service.provider.compiledCloudFormationTemplate.Resources[
          deploymentBucketPolicyLogicalId
        ];
      }
    }

    const isS3TransferAccelerationSupported = this.provider.isS3TransferAccelerationSupported();
    const isS3TransferAccelerationEnabled = this.provider.isS3TransferAccelerationEnabled();
    const isS3TransferAccelerationDisabled = this.provider.isS3TransferAccelerationDisabled();

    if (isS3TransferAccelerationEnabled && isS3TransferAccelerationDisabled) {
      const errorMessage = [
        'You cannot enable and disable S3 Transfer Acceleration at the same time',
      ].join('');
      throw new this.serverless.classes.Error(errorMessage);
    }

    if (bucketName) {
      if (isS3TransferAccelerationEnabled) {
        const warningMessage =
          'Warning: S3 Transfer Acceleration will not be enabled on deploymentBucket.';
        this.serverless.cli.log(warningMessage);
      }
      this.bucketName = bucketName;
      this.serverless.service.package.deploymentBucket = bucketName;
      this.serverless.service.provider.compiledCloudFormationTemplate.Outputs.ServerlessDeploymentBucketName.Value = bucketName;

      delete this.serverless.service.provider.compiledCloudFormationTemplate.Resources
        .ServerlessDeploymentBucket;
      delete this.serverless.service.provider.compiledCloudFormationTemplate.Resources
        .ServerlessDeploymentBucketPolicy;
      return;
    }

    if (isS3TransferAccelerationEnabled && isS3TransferAccelerationSupported) {
      // enable acceleration via CloudFormation
      Object.assign(
        this.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .ServerlessDeploymentBucket.Properties,
        {
          AccelerateConfiguration: {
            AccelerationStatus: 'Enabled',
          },
        }
      );
      // keep track of acceleration status via CloudFormation Output
      this.serverless.service.provider.compiledCloudFormationTemplate.Outputs.ServerlessDeploymentBucketAccelerated = {
        Value: true,
      };
    } else if (isS3TransferAccelerationDisabled && isS3TransferAccelerationSupported) {
      // explicitly disable acceleration via CloudFormation
      Object.assign(
        this.serverless.service.provider.compiledCloudFormationTemplate.Resources
          .ServerlessDeploymentBucket.Properties,
        {
          AccelerateConfiguration: {
            AccelerationStatus: 'Suspended',
          },
        }
      );
    }

    const coreTemplateFileName = this.provider.naming.getCoreTemplateFileName();

    const coreTemplateFilePath = path.join(
      this.serverless.config.servicePath,
      '.serverless',
      coreTemplateFileName
    );

    this.serverless.utils.writeFileSync(
      coreTemplateFilePath,
      this.serverless.service.provider.compiledCloudFormationTemplate
    );

    this.serverless.service.provider.coreCloudFormationTemplate = _.cloneDeep(
      this.serverless.service.provider.compiledCloudFormationTemplate
    );
  },
};
