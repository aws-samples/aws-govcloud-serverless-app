/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */
import * as cdk from 'aws-cdk-lib';
import { AuthorizationType, CfnAuthorizer, Cors, EndpointType, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { OAuthScope, UserPool, UserPoolClient, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, Runtime, S3Code } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketEncryption, BucketPolicy } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class AwsGovcloudServerlessAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoTable = new Table(this, 'items', {
      partitionKey: {
        name: 'ID',
        type: AttributeType.STRING
      },
      tableName: 'HelloWorldDatabase',

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const codeBucketName = new cdk.CfnParameter(this, "CodeBucketName", {
      type: "String",
      description: "The name of the Amazon S3 bucket where the uploaded code. Default is codebucket-<cdk-default-account>-<cdk-default-region>",
      default: "codebucket-" + process.env.CDK_DEFAULT_ACCOUNT + "-" + process.env.CDK_DEFAULT_REGION
    });

    const codeBucket = new Bucket(this, 'CodeBucket', {
      bucketName: codeBucketName.valueAsString,
      websiteIndexDocument: 'index.html',
      publicReadAccess: false,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    })

    const codeDeployment = new BucketDeployment(this, 'DeployCode', {
      sources: [Source.asset('./src')],
      destinationBucket: codeBucket
    })

    const lambdaCode = new S3Code(codeBucket, "helloworld.py.zip");

    // Function that returns 201 with "Hello world!"
    const helloWorldFunction = new Function(this, 'helloWorldFunction', {
      code: lambdaCode,
      handler: 'helloworld.handler',
      runtime: Runtime.PYTHON_3_8
    });

    helloWorldFunction.node.addDependency(codeDeployment);

    // Grant write access
    dynamoTable.grantWriteData(helloWorldFunction);

    // Cognito User Pool with Email Sign-in Type.
    const userPool = new UserPool(this, 'userPool', {
      signInAliases: {
        email: true
      },
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Verify your email for our awesome app!',
        emailBody: 'Thanks for signing up to our awesome app! Your verification code is {####}',
        emailStyle: VerificationEmailStyle.CODE,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    // Cognito App Client
    const appClient = new UserPoolClient(this, 'gc-appclient', {
      userPool: userPool,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          OAuthScope.OPENID,
          OAuthScope.PROFILE
        ],
      },
      userPoolClientName: 'HelloWorldApp'
    });

    // Rest API backed by the helloWorldFunction
    const helloWorldLambdaRestApi = new RestApi(this, 'helloWorldLambdaRestApi', {
      restApiName: 'Hello World API',
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      }
    });

    // Authorizer for the Hello World API that uses the
    // Cognito User pool to Authorize users.
    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: helloWorldLambdaRestApi.restApiId,
      name: 'HelloWorldAPIAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });

    const resourceName = 'hello'
    // Hello Resource API for the REST API. 
    const hello = helloWorldLambdaRestApi.root.addResource(resourceName);

    hello.addCorsPreflight({
      allowMethods: Cors.ALL_METHODS,
      allowOrigins: Cors.ALL_ORIGINS,
      allowHeaders: [
        'Content-Type',
        'X-Amz-Date',
        'Authorization',
        'X-Api-Key',
        'X-Amz-Security-Token', 
        'Api-Auth-Token'
      ], 
    });
  
    // GET method for the hello API resource. It uses Cognito for
    // authorization and the auathorizer defined above.
    const helloWorldIntegration = new LambdaIntegration(helloWorldFunction);

    hello.addMethod('POST', helloWorldIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });

    // Create and associate WAF Web ACL with API Gateway
    // Create our Web ACL
    let webACL = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: {
        allow: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true
      },
      rules: awsManagedRules.map(wafRule => wafRule.rule)
    });
    
    // Associate with our gateway
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      webAclArn: webACL.attrArn,
      resourceArn: helloWorldLambdaRestApi.deploymentStage.stageArn
    })

    const websiteBucketName = new cdk.CfnParameter(this, "WebsiteBucketName", {
      type: "String",
      description: "The name of the Amazon S3 bucket where the uploaded code. Default is websitebucket-<cdk-default-account>-<cdk-default-region>",
      default: "websitebucket-" + process.env.CDK_DEFAULT_ACCOUNT + "-" + process.env.CDK_DEFAULT_REGION
    });
    
    // Create S3 website hosting
    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      bucketName: websiteBucketName.valueAsString,
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    })

    const bucketPolicy = new BucketPolicy(this, 'Bucket-Policy', {
      bucket: websiteBucket
    });

    bucketPolicy.document.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal],
        actions: ['s3:GetObject', 's3:GetObjectVersion'],
        resources: [`${websiteBucket.bucketArn}/*}`],
        // Only allow a specific aws:referer
        conditions: {
          StringNotEquals: {
            'aws:Referer': 'referertest',
          }
        }
      }));
    
    // Outputs
    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
      description: 'The Cognito User Pool Id',
      exportName: 'userPoolId',
    });

    new cdk.CfnOutput(this, 'appClientId', {
      value: appClient.userPoolClientId,
      description: 'The Cognito User Pool App Client Id',
      exportName: 'userPoolAppClientId',
    });

    new cdk.CfnOutput(this, 'apigw-endpoint-url', {
      value: helloWorldLambdaRestApi.url + resourceName,
      description: 'The API Gateway endpoint url',
      exportName: 'apigw-endpoint-url',
    });

    new cdk.CfnOutput(this, 'code-bucket-output', {
      value: codeBucketName.valueAsString,
      description: 'The S3 bucket for the code used by the Lambda function backing the API Gateway resource',
      exportName: 'code-bucket-output',
    });

    new cdk.CfnOutput(this, 'website-bucket-output', {
      value: websiteBucketName.valueAsString,
      description: 'The S3 bucket for hosting the artifacts for the frontend application',
      exportName: 'website-bucket-output',
    });
  }
}

interface WafRule {
  name: string;
  rule: wafv2.CfnWebACL.RuleProperty;
}

const awsManagedRules: WafRule[] = [
  // AWS IP Reputation list includes known malicious actors/bots and is regularly updated
  {
      name: 'AWS-AWSManagedRulesAmazonIpReputationList',
      rule: {
      name: 'AWS-AWSManagedRulesAmazonIpReputationList',
      priority: 10,
      statement: {
          managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesAmazonIpReputationList',
          },
      },
      overrideAction: {
          none: {},
      },
      visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AWSManagedRulesAmazonIpReputationList',
      },
      },
  },
  // Common Rule Set aligns with major portions of OWASP Core Rule Set
  {
      name: 'AWS-AWSManagedRulesCommonRuleSet',
      rule:
      {
      name: 'AWS-AWSManagedRulesCommonRuleSet',
      priority: 20,
      statement: {
          managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          // Excluding generic RFI body rule for sns notifications
          // https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
            excludedRules: [
             { name: 'GenericRFI_BODY' },
             { name: 'SizeRestrictions_BODY' },
          ],
          },
      },
      overrideAction: {
          none: {},
      },
      visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AWS-AWSManagedRulesCommonRuleSet',
      },
      },
  },
  // Blocks common SQL Injection
  {
      name: 'AWSManagedRulesSQLiRuleSet',
      rule: {
      name: 'AWSManagedRulesSQLiRuleSet',
      priority: 30,
      visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AWSManagedRulesSQLiRuleSet',
      },
      overrideAction: {
          none: {},
      },
      statement: {
          managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesSQLiRuleSet',
          excludedRules: [],
          },
      },
      },
  },
  // Blocks common PHP attacks such as using high risk variables and methods in the body or queries
  {
      name: 'AWSManagedRulePHP',
      rule: {
      name: 'AWSManagedRulePHP',
      priority: 40,
      visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AWSManagedRulePHP',
      },
      overrideAction: {
          none: {},
      },
      statement: {
          managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesPHPRuleSet',
          excludedRules: [],
          },
      },
      },
  },
  // Blocks attacks targeting LFI(Local File Injection) for linux systems
  {
      name: 'AWSManagedRuleLinux',
      rule: {
      name: 'AWSManagedRuleLinux',
      priority: 50,
      visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AWSManagedRuleLinux',
      },
      overrideAction: {
          none: {},
      },
      statement: {
          managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesLinuxRuleSet',
          excludedRules: [],
          },
      },
      },
  },
];