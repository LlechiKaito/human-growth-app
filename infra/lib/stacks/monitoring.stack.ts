import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import type * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type * as rds from 'aws-cdk-lib/aws-rds';
import type { Construct } from 'constructs';

interface MonitoringStackProps extends StackProps {
  apiService: apprunner.CfnService;
  database: rds.DatabaseInstance;
  distribution: cloudfront.Distribution;
}

/**
 * Monitoring Stack
 * CloudWatch Dashboard + 主要アラーム
 */
export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: 'human-growth-overview',
    });

    const dbCpu = props.database.metricCPUUtilization({ period: Duration.minutes(5) });
    const dbConnections = props.database.metricDatabaseConnections({
      period: Duration.minutes(5),
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'RDS CPU Utilization',
        left: [dbCpu],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'RDS Connections',
        left: [dbConnections],
        width: 12,
      }),
    );

    new cloudwatch.Alarm(this, 'DbCpuAlarm', {
      metric: dbCpu,
      threshold: 80,
      evaluationPeriods: 3,
      alarmDescription: 'RDS CPU > 80%',
    });

    new cloudwatch.Alarm(this, 'ApiRequestErrorAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/AppRunner',
        metricName: '5xxStatusResponses',
        dimensionsMap: { ServiceName: props.apiService.serviceName! },
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'API 5xx > 10 in 5 min',
    });
  }
}
