import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDashboardDomain } from '@modules/analytic/domains/analytic.dashboard.domain';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { ActivityLogDomainModule } from '@modules/activity-log/activity-log.domain.module';
import { ApiKeyDomainModule } from '@modules/api-key/api-key.domain.module';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { SessionDomainModule } from '@modules/session/session.domain.module';
import { TermPolicyDomainModule } from '@modules/term-policy/term-policy.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        AnalyticCache,
        AnalyticDateUtil,
        AnalyticGeoUtil,
        AnalyticSortUtil,
        AnalyticDateDomain,
        AnalyticDashboardDomain,
        AnalyticAnomalyDomain,
        AnalyticFraudDomain,
        AnalyticWorkspaceUserDomain,
    ],
    exports: [
        AnalyticCache,
        AnalyticGeoUtil,
        AnalyticDateDomain,
        AnalyticDashboardDomain,
        AnalyticAnomalyDomain,
        AnalyticFraudDomain,
        AnalyticWorkspaceUserDomain,
    ],
    imports: [
        ActivityLogDomainModule,
        SessionDomainModule,
        UserDomainModule,
        DeviceDomainModule,
        PasswordHistoryDomainModule,
        ApiKeyDomainModule,
        TermPolicyDomainModule,
        WorkspaceDomainModule,
        ProjectDomainModule,
    ],
})
export class AnalyticDomainModule {}
