import { Module } from '@nestjs/common';
import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { RoutesUserModule } from '@router/routes/routes.user.module';
import { RoutesPublicModule } from '@router/routes/routes.public.module';
import { RoutesAdminModule } from '@router/routes/routes.admin.module';
import { RoutesSystemModule } from '@router/routes/routes.system.module';
import { RoutesSharedModule } from '@router/routes/routes.shared.module';

@Module({
    providers: [],
    exports: [],
    controllers: [],
    imports: [
        RoutesPublicModule,
        RoutesSystemModule,
        RoutesUserModule,
        RoutesAdminModule,
        RoutesSharedModule,
        NestJsRouterModule.register([
            {
                path: '/public',
                module: RoutesPublicModule,
            },
            {
                path: '/system',
                module: RoutesSystemModule,
            },
            {
                path: '/admin',
                module: RoutesAdminModule,
            },
            {
                path: '/user',
                module: RoutesUserModule,
            },
            {
                path: '/shared',
                module: RoutesSharedModule,
            },
        ]),
    ],
})
export class RouterModule {}
