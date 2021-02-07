<!--
title: Serverless Framework - AWS Lambda Events - SQS Queues
menuText: SQS
menuOrder: 8
description:  Setting up AWS SQS Queue Events with AWS Lambda via the Serverless Framework
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->

### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/aws/events/sqs)

<!-- DOCS-SITE-LINK:END -->

# SQS Queues

In the following example, we specify that the `compute` function should be triggered whenever there are messages in the given SQS Queue.

The ARN for the queue can be specified as a string, the reference to the ARN of a resource by logical ID, or the import of an ARN that was exported by a different service or CloudFormation stack.

**Note:** The `sqs` event will hook up your existing SQS Queue to a Lambda function. Serverless won't create a new queue for you.

```yml
functions:
  compute:
    handler: handler.compute
    events:
      # These are all possible formats
      - sqs: arn:aws:sqs:region:XXXXXX:MyFirstQueue
      - sqs:
          arn:
            Fn::GetAtt:
              - MySecondQueue
              - Arn
      - sqs:
          arn:
            Fn::ImportValue: MyExportedQueueArnId
      - sqs:
          arn:
            Fn::Join:
              - ':'
              - - arn
                - aws
                - sqs
                - Ref: AWS::Region
                - Ref: AWS::AccountId
                - MyOtherQueue
```

## Setting the BatchSize

For the SQS event integration, you can set the `batchSize`, which effects how many SQS messages can be included in a single Lambda invocation. The default `batchSize` is `10`. The max `batchSize` is `10000` for a standard queue, `10` for a FIFO queue.

You can also set `maximumBatchingWindow` to standard queues to specify the maximum amount of time in seconds to gather records before invoking the function. The max `maximumBatchingWindow` is `300` seconds. Check [AWS documentation](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html) for more details.

```yml
functions:
  compute:
    handler: handler.compute
    events:
      - sqs:
          arn: arn:aws:sqs:region:XXXXXX:myQueue
          batchSize: 10
          maximumBatchingWindow: 60
```

## IAM Permissions

The Serverless Framework will automatically configure the most minimal set of IAM permissions for you. However you can still add additional permissions if you need to. Read the official [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-lambda-function-trigger.html) for more information about IAM Permissions for SQS events.
