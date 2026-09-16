import { ActivityLogRepositoryModule } from '@modules/activity-log/activity-log.repository.module';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';

/**
 * Global so the activity log domain, util, and always-on flush interceptor are
 * injectable across the HTTP stack.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        ActivityLogDomain,
        ActivityLogUtil,
        {
            provide: APP_INTERCEPTOR,
            useClass: ActivityLogInterceptor,
        },
        ActivityLogAnalyticDomain,
    ],
    exports: [ActivityLogDomain, ActivityLogUtil, ActivityLogAnalyticDomain],
    imports: [ActivityLogRepositoryModule],
})
export class ActivityLogDomainModule {}
