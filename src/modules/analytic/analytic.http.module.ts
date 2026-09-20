import { AnalyticDomainModule } from '@modules/analytic/analytic.domain.module';
import { AnalyticAnomalyHttpService } from '@modules/analytic/services/analytic.anomaly.http.service';
import { AnalyticDashboardHttpService } from '@modules/analytic/services/analytic.dashboard.http.service';
import { AnalyticFraudHttpService } from '@modules/analytic/services/analytic.fraud.http.service';
import { AnalyticWorkspaceUserHttpService } from '@modules/analytic/services/analytic.workspace-user.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        AnalyticDashboardHttpService,
        AnalyticAnomalyHttpService,
        AnalyticFraudHttpService,
        AnalyticWorkspaceUserHttpService,
    ],
    exports: [
        AnalyticDashboardHttpService,
        AnalyticAnomalyHttpService,
        AnalyticFraudHttpService,
        AnalyticWorkspaceUserHttpService,
    ],
    imports: [AnalyticDomainModule],
})
export class AnalyticHttpModule {}
