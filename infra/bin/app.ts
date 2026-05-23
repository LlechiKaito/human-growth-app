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

// プロジェクト全体に付与する必須タグ (コスト配賦・運用識別のため)
// Tags.of(app) で配下の全スタック・全リソースに自動伝播する
Tags.of(app).add('Project', projectName);
Tags.of(app).add('Environment', environment);
Tags.of(app).add('ManagedBy', 'CDK');

const prefix = `${projectName}-${environment}`;

const network = new NetworkStack(app, `${prefix}-network`, { env });
Tags.of(network).add('Service', 'network');

const database = new DatabaseStack(app, `${prefix}-database`, {
  env,
  vpc: network.vpc,
  databaseSecurityGroup: network.databaseSecurityGroup,
});
Tags.of(database).add('Service', 'database');

const auth = new AuthStack(app, `${prefix}-auth`, { env });
Tags.of(auth).add('Service', 'auth');

const compute = new ComputeStack(app, `${prefix}-compute`, {
  env,
  dbSecret: database.secret,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
});
Tags.of(compute).add('Service', 'compute');

const frontend = new FrontendStack(app, `${prefix}-frontend`, {
  env,
  apiServiceUrl: compute.serviceUrl,
});
Tags.of(frontend).add('Service', 'frontend');

const monitoring = new MonitoringStack(app, `${prefix}-monitoring`, {
  env,
  apiService: compute.service,
  database: database.instance,
  distribution: frontend.distribution,
});
Tags.of(monitoring).add('Service', 'monitoring');
