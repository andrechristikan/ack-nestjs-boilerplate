import { Module } from '@nestjs/common';
import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { RoutesAdminModule } from '@routes/routes.admin.module';
import { RoutesPublicModule } from '@routes/routes.public.module';
import { RoutesSharedModule } from '@routes/routes.shared.module';
import { RoutesSystemModule } from '@routes/routes.system.module';
import { RoutesUserModule } from '@routes/routes.user.module';

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
