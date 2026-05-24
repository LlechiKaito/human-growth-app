import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';

/**
 * Auth Stack
 * Cognito User Pool (Email/Password)
 * 将来 SAML / OIDC フェデレーション追加可能
 */
export class AuthStack extends Stack {
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'human-growth-users',
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: true,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: { required: true, mutable: false },
        givenName: { required: false, mutable: true },
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('AppClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      generateSecret: false,
      accessTokenValidity: undefined,
      idTokenValidity: undefined,
      refreshTokenValidity: undefined,
    });

    // 管理者グループ。本グループに属するユーザーは /admin/* 配下にアクセス可能。
    // 初期管理者の追加は AWS CLI で実施 (docs/deploy.md 参照):
    //   aws cognito-idp admin-add-user-to-group \
    //     --user-pool-id <UserPoolId> --username <email> --group-name admins
    new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admins',
      description: 'Administrators of the Skill Quest RPG',
      precedence: 1,
    });

    this.userPool = userPool;
    this.userPoolClient = userPoolClient;

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
