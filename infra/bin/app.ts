#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';

import { AuthStack } from '../lib/stacks/auth.stack';
import { ComputeStack } from '../lib/stacks/compute.stack';
import { DatabaseStack } from '../lib/stacks/database.stack';
import { FrontendStack } from '../lib/stacks/frontend.stack';
import { MonitoringStack } from '../lib/stacks/monitoring.stack';
import { NetworkStack } from '../lib/stacks/network.stack';

const app = new App();

const projectName = app.node.tryGetContext('projectName') ?? 'human-growth';
const environment = app.node.tryGetContext('environment') ?? 'dev';
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
};

const prefix = `${projectName}-${environment}`;

const network = new NetworkStack(app, `${prefix}-network`, { env });
const database = new DatabaseStack(app, `${prefix}-database`, {
  env,
  vpc: network.vpc,
  databaseSecurityGroup: network.databaseSecurityGroup,
});
const auth = new AuthStack(app, `${prefix}-auth`, { env });
const compute = new ComputeStack(app, `${prefix}-compute`, {
  env,
  vpc: network.vpc,
  dbSecret: database.secret,
  appRunnerSecurityGroup: network.appRunnerSecurityGroup,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
});
const frontend = new FrontendStack(app, `${prefix}-frontend`, {
  env,
  apiServiceUrl: compute.serviceUrl,
});
new MonitoringStack(app, `${prefix}-monitoring`, {
  env,
  apiService: compute.service,
  database: database.instance,
  distribution: frontend.distribution,
});

const stacks = [network, database, auth, compute, frontend];
for (const stack of stacks) {
  Tags.of(stack).add('Project', projectName);
  Tags.of(stack).add('Environment', environment);
  Tags.of(stack).add('ManagedBy', 'CDK');
}
