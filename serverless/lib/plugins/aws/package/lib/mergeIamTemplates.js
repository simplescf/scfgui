'use strict';

const _ = require('lodash');
const path = require('path');

module.exports = {
  mergeIamTemplates() {
    // resolve early if no functions are provided
    if (!this.serverless.service.getAllFunctions().length) {
      return;
    }

    // create log group resources
    this.serverless.service
      .getAllFunctions()
      .filter((functionName) => !this.serverless.service.getFunction(functionName).disableLogs)
      .forEach((functionName) => {
        const functionObject = this.serverless.service.getFunction(functionName);
        const logGroupLogicalId = this.provider.naming.getLogGroupLogicalId(functionName);
        const newLogGroup = {
          [logGroupLogicalId]: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
              LogGroupName: this.provider.naming.getLogGroupName(functionObject.name),
            },
          },
        };

        const logRetentionInDays = this.provider.getLogRetentionInDays();
        if (logRetentionInDays) {
          newLogGroup[logGroupLogicalId].Properties.RetentionInDays = logRetentionInDays;
        }

        _.merge(
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
          newLogGroup
        );
      });

    // resolve early if provider level role is provided
    if ('role' in this.serverless.service.provider) {
      return;
    }

    // resolve early if all functions contain a custom role
    const customRoleProvided = this.serverless.service.getAllFunctions().every((functionName) => {
      const functionObject = this.serverless.service.getFunction(functionName);
      return 'role' in functionObject;
    });

    if (customRoleProvided) {
      return;
    }

    // merge in the iamRoleLambdaTemplate
    const iamRoleLambdaExecutionTemplate = this.serverless.utils.readFileSync(
      path.join(
        this.serverless.config.serverlessPath,
        'plugins',
        'aws',
        'package',
        'lib',
        'iam-role-lambda-execution-template.json'
      )
    );
    iamRoleLambdaExecutionTemplate.Properties.Path = this.provider.naming.getRolePath();
    iamRoleLambdaExecutionTemplate.Properties.RoleName = this.provider.naming.getRoleName();

    if (this.serverless.service.provider.rolePermissionsBoundary) {
      iamRoleLambdaExecutionTemplate.Properties.PermissionsBoundary = this.serverless.service.provider.rolePermissionsBoundary;
    }

    iamRoleLambdaExecutionTemplate.Properties.Policies[0].PolicyName = this.provider.naming.getPolicyName();

    _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
      [this.provider.naming.getRoleLogicalId()]: iamRoleLambdaExecutionTemplate,
    });

    const canonicalFunctionNamePrefix = `${
      this.provider.serverless.service.service
    }-${this.provider.getStage()}`;
    const logGroupsPrefix = this.provider.naming.getLogGroupName(canonicalFunctionNamePrefix);

    const policyDocumentStatements = this.serverless.service.provider.compiledCloudFormationTemplate
      .Resources[this.provider.naming.getRoleLogicalId()].Properties.Policies[0].PolicyDocument
      .Statement;

    let hasOneOrMoreCanonicallyNamedFunctions = false;
    const disableLogsCanonicallyNamedFunctions = [];

    // Ensure policies for functions with custom name resolution
    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const {
        name: resolvedFunctionName,
        disableLogs: areLogsDisabled,
      } = this.serverless.service.getFunction(functionName);
      if (!resolvedFunctionName || resolvedFunctionName.startsWith(canonicalFunctionNamePrefix)) {
        if (areLogsDisabled) {
          disableLogsCanonicallyNamedFunctions.push(resolvedFunctionName);
        } else {
          hasOneOrMoreCanonicallyNamedFunctions = true;
        }
        return;
      }

      if (!areLogsDisabled) {
        const customFunctionNamelogGroupsPrefix = this.provider.naming.getLogGroupName(
          resolvedFunctionName
        );

        policyDocumentStatements[0].Resource.push({
          'Fn::Sub':
            'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
            `:log-group:${customFunctionNamelogGroupsPrefix}:*`,
        });

        policyDocumentStatements[1].Resource.push({
          'Fn::Sub':
            'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
            `:log-group:${customFunctionNamelogGroupsPrefix}:*:*`,
        });
      }
    });

    if (hasOneOrMoreCanonicallyNamedFunctions) {
      // Ensure general policies for functions with default name resolution
      policyDocumentStatements[0].Resource.push({
        'Fn::Sub':
          'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
          `:log-group:${logGroupsPrefix}*:*`,
      });

      policyDocumentStatements[1].Resource.push({
        'Fn::Sub':
          'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
          `:log-group:${logGroupsPrefix}*:*:*`,
      });
      if (disableLogsCanonicallyNamedFunctions.length > 0) {
        // add deny rule for disabled logs function
        const arnOfDisableLogGroups = disableLogsCanonicallyNamedFunctions.map((functionName) => {
          return {
            'Fn::Sub':
              'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
              `:log-group:${this.provider.naming.getLogGroupName(functionName)}:*`,
          };
        });

        this.mergeStatements([
          {
            Effect: 'Deny',
            Action: 'logs:PutLogEvents',
            Resource: arnOfDisableLogGroups,
          },
        ]);
      }
    }

    if (this.serverless.service.provider.iamRoleStatements) {
      // add custom iam role statements
      this.mergeStatements(this.serverless.service.provider.iamRoleStatements);
    }

    if (this.serverless.service.provider.iamManagedPolicies) {
      // add iam managed policies
      const iamManagedPolicies = this.serverless.service.provider.iamManagedPolicies;
      if (iamManagedPolicies.length > 0) {
        this.mergeManagedPolicies(iamManagedPolicies);
      }
    }

    // check if one of the functions contains vpc configuration
    const vpcConfigProvided = this.serverless.service.getAllFunctions().some((functionName) => {
      const functionObject = this.serverless.service.getFunction(functionName);
      return 'vpc' in functionObject;
    });

    if (vpcConfigProvided || this.serverless.service.provider.vpc) {
      // add managed iam policy to allow ENI management
      this.mergeManagedPolicies([
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              { Ref: 'AWS::Partition' },
              ':iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
            ],
          ],
        },
      ]);
    }

    return;
  },

  mergeManagedPolicies(managedPolicies) {
    const resource = this.serverless.service.provider.compiledCloudFormationTemplate.Resources[
      this.provider.naming.getRoleLogicalId()
    ].Properties;
    if (!Array.isArray(resource.ManagedPolicyArns)) {
      resource.ManagedPolicyArns = [];
    }

    resource.ManagedPolicyArns.push(...managedPolicies);
  },

  mergeStatements(statements) {
    this.serverless.service.provider.compiledCloudFormationTemplate.Resources[
      this.provider.naming.getRoleLogicalId()
    ].Properties.Policies[0].PolicyDocument.Statement.push(...statements);
  },
};
