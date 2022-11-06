
# Building modern serverless applications in AWS GovCloud(US)

Project that builds the architecture described in the following Blog:

[How to improve government customer experience by building a modern serverless web application in AWS GovCloud (US)](https://aws.amazon.com/blogs/publicsector/how-improve-government-customer-experience-building-modern-serverless-web-application-aws-govcloud-us/)

Important: this application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the [AWS Pricing page](https://aws.amazon.com/pricing/) for details. You are responsible for any AWS costs incurred. No warranty is implied in this example.

```bash
.
├── README.MD                         <-- This instructions file
├── aws-govcloud-serverless-stack     <--  Project for building out the infrastructure shown in the architecture 
├── frontend                          <-- Source code for the React frontend application
```

## Requirements

* An [AWS GovCloud (US)](https://aws.amazon.com/govcloud-us/?whats-new-ess.sort-by=item.additionalFields.postDateTime&whats-new-ess.sort-order=desc) account. ([Create a GovCloud account](https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/getting-started-sign-up.html) if you do not already have one and login.). **Note:** A GovCloud account is not required, as this project can be deployed to an AWS standard account. GovCloud is recommended, in order to follow along with the content presented in the blog mentioned earlier. If an AWS standard account is preferred, then [Create an AWS standard account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) and log in.
* AWS CLI already configured with appropriate permissions to build and deploy [CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
* [NodeJS 14.x installed](https://nodejs.org/en/download/)
* [AWS Cloud Development Kit (AWS CDK) v2 installed](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) *minimum version 2.45*.

## Installation Instructions

1. Clone the repo onto your local development machine:
```
git clone https://github.com/aws-samples/aws-govcloud-serverless-app
```

### 1. Set up infrastructure

1. From the command line, install the infrastructure stack (aws-govcloud-serverless-stack):
```sh
cd ./aws-govcloud-serverless-stack
npm install
npm run build
cdk bootstrap
cdk deploy
```
During the following prompt, `Do you wish to deploy these changes (y/n)?`, enter *y*, to enable the infrastructure to deployed.

Note the following from the `Outputs` section of the deployment, as some of the values would be required for the next steps. Alternatively, these values can be retrieved from the *[Outputs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html)* section of the AWS CloudFormation stack, via the AWS Management Console.

**Sample** output:
```
AwsGovcloudServerlessAppStack.apigwendpointurl = https://<random value>.execute-api.us-gov-west-1.amazonaws.com/prod/hello
AwsGovcloudServerlessAppStack.appClientId = <random value>
AwsGovcloudServerlessAppStack.codebucketoutput = codebucket-<AWS Account ID>-us-gov-west-1
AwsGovcloudServerlessAppStack.userPoolId = us-gov-west-1_<random value>
AwsGovcloudServerlessAppStack.websitebucketoutput = websitebucket-<AWS Account ID>-us-gov-west-1
```

### 2. Configuring and building the frontend application

The frontend code is saved in the `frontend` subdirectory. 

1. Before building, you need to set environment variables in the `src\config.json` file:

- userPoolId: The Amazon Cognito pool ID from earlier (Value of AwsGovcloudServerlessAppStack.userPoolId).
- clientId: The Cognito App client ID from earlier (Value of AwsGovcloudServerlessAppStack.appClientId).
- apiUrl: The url of the Amazon API Gateway resource from earlier (Value of AwsGovcloudServerlessAppStack.apigwendpointurl).

2. Change directory into the frontend code directory, and run the NPM installation:

```
cd ../frontend
npm install
npm run build
```
### 3. Upload the frontend application artifacts to the frontend (Amazon S3) Bucket

The frontend application build is saved in the `frontend\build` subdirectory. Upload the contents of the directory to the S3 Bucket created in Step 1 i.e. value of *AwsGovcloudServerlessAppStack.websitebucketoutput*

In order to do this via the AWS CLI (Assuming current working directory is *frontend*). *Replace the bucket name with the one created in Step 1*:

```
cd ./build
aws s3 cp . s3://websitebucket-<AWS Account ID>-us-gov-west-1 --recursive
```

### 4. Follow the blog for the rest of the setup 

## Cleanup

1. Manually delete any objects in the S3 buckets created in step 1 of the installation instructions.
2. Use the CloudFormation console to delete all the stacks deployed or
```sh
cd ./aws-govcloud-serverless-stack
cdk destroy
```

During the following prompt `Are you sure you want to delete: AwsGovcloudServerlessAppStack (y/n)`, , enter *y*, to enable the infrastructure to destroyed.
3. There may be additional cleanup required, for resources created in the steps mentioned in the blog. Please follow the cleanup notes in the blog as applicable.

If you have any questions, please contact the author or raise an issue in the GitHub repo.

==============================================

Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.

SPDX-License-Identifier: MIT-0