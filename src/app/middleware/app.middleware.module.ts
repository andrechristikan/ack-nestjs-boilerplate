import {
    Module,
    NestModule,
    MiddlewareConsumer,
    RequestMethod,
} from '@nestjs/common';
import { AppMaintenanceMiddleware } from 'src/app/middleware/maintenance/app.maintenance.middleware';

@Module({})
export class AppMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(AppMaintenanceMiddleware)
            .exclude(
                {
                    path: 'api/v:version*/auth/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/auth/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/auth/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/auth/refresh',
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
