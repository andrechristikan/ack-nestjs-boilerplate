import {
    Module,
    NestModule,
    MiddlewareConsumer,
    RequestMethod,
} from '@nestjs/common';
import { SettingMaintenanceMiddleware } from 'src/common/setting/middleware/maintenance/setting.maintenance.middleware';

@Module({})
export class SettingMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(SettingMaintenanceMiddleware)
            .exclude(
                {
                    path: 'api/v:version*/user/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/user/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/user/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/user/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/admin/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/admin/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/v:version*/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/setting/(.*)',
                    method: RequestMethod.ALL,
                }
            )
            .forRoutes('*');
    }
}
