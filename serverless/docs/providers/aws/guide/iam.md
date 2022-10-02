<!--
title: Serverless Framework - AWS Lambda Guide - IAM
description: How to manage your AWS Lambda functions and their AWS infrastructure resources easily with the Serverless Framework.
menuText: IAM
menuOrder: 13
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->

### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/aws/guide/iam)

<!-- DOCS-SITE-LINK:END -->

# IAM

Every AWS Lambda function needs permission to interact with other AWS infrastructure resources within your account. These permissions are set via an AWS IAM Role which the Serverless Framework automatically creates for each Serverless Service, and is shared by all of your Functions. The Framework allows you to modify this Role or create Function-specific Roles, easily.

## The Default IAM Role

By default, one IAM Role is shared by all of the Lambda functions in your service. Also by default, your Lambda functions have permission to create and write to CloudWatch logs. When VPC configuration is provided the default AWS `AWSLambdaVPCAccessExecutionRole` will be associated in order to communicate with your VPC resources.

To add specific rights to this service-wide Role, define statements in `provider.iamRoleStatements` which will be merged into the generated policy. As those statements will be merged into the CloudFormation template, you can use `Join`, `Ref` or any other CloudFormation method or feature.

```yml
service: new-service

provider:
  name: aws
  iamRoleStatements:
    - Effect: 'Allow'
      Action:
        - 's3:ListBucket'
      Resource:
        Fn::Join:
          - ''
          - - 'arn:aws:s3:::'
            - Ref: ServerlessDeploymentBucket
    - Effect: 'Allow'
      Action:
        - 's3:PutObject'
      Resource:
        Fn::Join:
          - ''
          - - 'arn:aws:s3:::'
            - Ref: ServerlessDeploymentBucket
            - '/*'
```

Alongside `provider.iamRoleStatements` managed policies can also be added to this service-wide Role, define managed policies in `provider.iamManagedPolicies`. These will also be merged into the generated IAM Role so you can use `Join`, `Ref` or any other CloudFormation method or feature here too.

```yml
service: new-service

provider:
  name: aws
  iamManagedPolicies:
    - 'some:aws:arn:xxx:*:*'
    - 'someOther:aws:arn:xxx:*:*'
    - { 'Fn::Join': [':', ['arn:aws:iam:', { Ref: 'AWS::AccountId' }, 'some/path']] }
```

## Custom IAM Roles

**WARNING:** You need to take care of the overall role setup as soon as you define custom roles.

That means that `iamRoleStatements` you've defined on the `provider` level won't be applied anymore. Furthermore, you need to provide the corresponding permissions for your Lambdas `logs` and [`stream`](../events/streams.md) events.

Serverless empowers you to define custom roles and apply them to your functions on a provider or individual function basis. To do this, you must declare a `role` attribute at the level at which you would like the role to be applied.

Defining it on the provider will make the role referenced by the `role` value the default role for any Lambda without its own `role` declared. This is to say that defining a `role` attribute on individual functions will override any provider level declared role. If every function within your service has a role assigned to it (either via provider level `role` declaration, individual declarations, or a mix of the two) then the default role and policy will not be generated and added to your Cloud Formation Template.

The `role` attribute can have a value of the logical name of the role, the ARN of the role, or an object that will resolve in the ARN of the role. The declaration `{ function: { role: 'myRole' } }` will result in `{ 'Fn::GetAtt': ['myRole', 'Arn'] }`. You can of course just declare an ARN like so `{ function: { role: 'an:aws:arn:xxx:*:*' } }`. This use case is primarily for those who must create their roles and / or policies via a means outside of Serverless.

Here are some examples of using these capabilities to specify Lambda roles.

### One Custom IAM Role For All Functions

```yml
service: new-service

provider:
  name: aws
  # declare one of the following...
  role: myDefaultRole                                                  # must validly reference a role defined in the service
  role: arn:aws:iam::0123456789:role//my/default/path/roleInMyAccount  # must validly reference a role defined in your account
  role:                                                                # must validly resolve to the ARN of a role you have the rights to use
    Fn::GetAtt:
      - myRole
      - Arn

functions:
  func0: # will assume 'myDefaultRole'
    ... # does not define role
  func1: # will assume 'myDefaultRole'
    ... # does not define role

resources:
  Resources:
    myDefaultRole:
      Type: AWS::IAM::Role
      Properties:
        Path: /my/default/path/
        RoleName: MyDefaultRole # required if you want to use 'serverless deploy --function' later on
        AssumeRolePolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: sts:AssumeRole
        # note that these rights are needed if you want your function to be able to communicate with resources within your vpc
        ManagedPolicyArns:
          - arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
        Policies:
          - PolicyName: myPolicyName
            PolicyDocument:
              Version: '2012-10-17'
              Statement:
                - Effect: Allow # note that these rights are given in the default policy and are required if you want logs out of your lambda(s)
                  Action:
                    - logs:CreateLogGroup
                    - logs:CreateLogStream
                    - logs:PutLogEvents
                  Resource:
                    - 'Fn::Join':
                      - ':'
                      -
                        - 'arn:aws:logs'
                        - Ref: 'AWS::Region'
                        - Ref: 'AWS::AccountId'
                        - 'log-group:/aws/lambda/*:*:*'
                -  Effect: "Allow"
                   Action:
                     - "s3:PutObject"
                   Resource:
                     Fn::Join:
                       - ""
                       - - "arn:aws:s3:::"
                         - "Ref" : "ServerlessDeploymentBucket"
```

### Custom IAM Roles For Each Function

```yml
service: new-service

provider:
  name: aws
  ... # does not define role

functions:
  func0:
    role: myCustRole0
    ...
  func1:
    role: myCustRole1
    ...

resources:
  Resources:
    myCustRole0:
      Type: AWS::IAM::Role
      Properties:
        Path: /my/cust/path/
        RoleName: MyCustRole0
        AssumeRolePolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: sts:AssumeRole
        Policies:
          - PolicyName: myPolicyName
            PolicyDocument:
              Version: '2012-10-17'
              Statement:
                - Effect: Allow
                  Action:
                    - logs:CreateLogGroup
                    - logs:CreateLogStream
                    - logs:PutLogEvents
                  Resource:
                    - 'Fn::Join':
                      - ':'
                      -
                        - 'arn:aws:logs'
                        - Ref: 'AWS::Region'
                        - Ref: 'AWS::AccountId'
                        - 'log-group:/aws/lambda/*:*:*'
                - Effect: Allow
                  Action:
                    - ec2:CreateNetworkInterface
                    - ec2:DescribeNetworkInterfaces
                    - ec2:DetachNetworkInterface
                    - ec2:DeleteNetworkInterface
                  Resource: "*"
    myCustRole1:
      Type: AWS::IAM::Role
      Properties:
        Path: /my/cust/path/
        RoleName: MyCustRole1
        AssumeRolePolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: sts:AssumeRole
        Policies:
          - PolicyName: myPolicyName
            PolicyDocument:
              Version: '2012-10-17'
              Statement:
                - Effect: Allow # note that these rights are given in the default policy and are required if you want logs out of your lambda(s)
                  Action:
                    - logs:CreateLogGroup
                    - logs:CreateLogStream
                    - logs:PutLogEvents
                  Resource:
                    - 'Fn::Join':
                      - ':'
                      -
                        - 'arn:aws:logs'
                        - Ref: 'AWS::Region'
                        - Ref: 'AWS::AccountId'
                        - 'log-group:/aws/lambda/*:*:*'
                -  Effect: "Allow"
                   Action:
                     - "s3:PutObject"
                   Resource:
                     Fn::Join:
                       - ""
                       - - "arn:aws:s3:::"
                         - "Ref" : "ServerlessDeploymentBucket"
```

### A Custom Default Role & Custom Function Roles

```yml
service: new-service

provider:
  name: aws
  role: myDefaultRole

functions:
  func0:
    role: myCustRole0
    ...
  func1:
    ... # does not define role

resources:
  Resources:
    myDefaultRole:
      Type: AWS::IAM::Role
      Properties:
        Path: /my/default/path/
        RoleName: MyDefaultRole
        AssumeRolePolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: sts:AssumeRole
        Policies:
          - PolicyName: myPolicyName
            PolicyDocument:
              Version: '2012-10-17'
              Statement:
                - Effect: Allow # note that these rights are given in the default policy and are required if you want logs out of your lambda(s)
                  Action:
                    - logs:CreateLogGroup
                    - logs:CreateLogStream
                    - logs:PutLogEvents
                  Resource:
                    - 'Fn::Join':
                      - ':'
                      -
                        - 'arn:aws:logs'
                        - Ref: 'AWS::Region'
                        - Ref: 'AWS::AccountId'
                        - 'log-group:/aws/lambda/*:*:*'
                -  Effect: "Allow"
                   Action:
                     - "s3:PutObject"
                   Resource:
                     Fn::Join:
                       - ""
                       - - "arn:aws:s3:::"
                         - "Ref" : "ServerlessDeploymentBucket"
    myCustRole0:
      Type: AWS::IAM::Role
      Properties:
        Path: /my/cust/path/
        RoleName: MyCustRole0
        AssumeRolePolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: sts:AssumeRole
        Policies:
          - PolicyName: myPolicyName
            PolicyDocument:
              Version: '2012-10-17'
              Statement:
                - Effect: Allow
                  Action:
                    - logs:CreateLogGroup
                    - logs:CreateLogStream
                    - logs:PutLogEvents
                  Resource:
                    - 'Fn::Join':
                      - ':'
                      -
                        - 'arn:aws:logs'
                        - Ref: 'AWS::Region'
                        - Ref: 'AWS::AccountId'
                        - 'log-group:/aws/lambda/*:*:*'
                - Effect: Allow
                  Action:
                    - ec2:CreateNetworkInterface
                    - ec2:DescribeNetworkInterfaces
                    - ec2:DetachNetworkInterface
                    - ec2:DeleteNetworkInterface
                  Resource: "*"

```
