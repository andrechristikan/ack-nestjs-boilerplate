import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDashboardDomain } from '@modules/analytic/domains/analytic.dashboard.domain';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        AnalyticCache,
        AnalyticDateUtil,
        AnalyticAnomalyUtil,
        AnalyticFraudUtil,
        AnalyticBucketUtil,
        AnalyticSortUtil,
        AnalyticDateDomain,
        AnalyticDashboardDomain,
        AnalyticAnomalyDomain,
        AnalyticFraudDomain,
        AnalyticWorkspaceUserDomain,
    ],
    exports: [
        AnalyticCache,
        AnalyticDateDomain,
        AnalyticDashboardDomain,
        AnalyticAnomalyDomain,
        AnalyticFraudDomain,
        AnalyticWorkspaceUserDomain,
    ],
    imports: [
        UserDomainModule,
        DeviceDomainModule,
        PasswordHistoryDomainModule,
        WorkspaceDomainModule,
        ProjectDomainModule,
    ],
})
export class AnalyticDomainModule {}
