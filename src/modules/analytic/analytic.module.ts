import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticBucketUtil } from '@modules/analytic/utils/analytic.bucket.util';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceModule } from '@modules/device/device.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { ProjectModule } from '@modules/project/project.module';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
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
        AnalyticDateService,
        AnalyticDashboardService,
        AnalyticAnomalyService,
        AnalyticFraudService,
        AnalyticWorkspaceUserService,
    ],
    exports: [
        AnalyticCache,
        AnalyticDateService,
        AnalyticDashboardService,
        AnalyticAnomalyService,
        AnalyticFraudService,
        AnalyticWorkspaceUserService,
    ],
    imports: [
        UserModule,
        DeviceModule,
        PasswordHistoryModule,
        WorkspaceModule,
        ProjectModule,
    ],
})
export class AnalyticModule {}
