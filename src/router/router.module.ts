import { Module } from '@nestjs/common';
import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { RouterHttpAdminModule } from '@router/http/router.http.admin.module';
import { RouterHttpPublicModule } from '@router/http/router.http.public.module';
import { RouterHttpSharedModule } from '@router/http/router.http.shared.module';
import { RouterHttpSystemModule } from '@router/http/router.http.system.module';
import { RouterHttpUserModule } from '@router/http/router.http.user.module';

/**
 * Root router that mounts the access-level route modules under their path prefixes
 * (`/public`, `/system`, `/admin`, `/user`, `/shared`).
 */
@Module({
    providers: [],
    exports: [],
    controllers: [],
    imports: [
        RouterHttpPublicModule,
        RouterHttpSystemModule,
        RouterHttpUserModule,
        RouterHttpAdminModule,
        RouterHttpSharedModule,
        NestJsRouterModule.register([
            {
                path: '/public',
                module: RouterHttpPublicModule,
            },
            {
                path: '/system',
                module: RouterHttpSystemModule,
            },
            {
                path: '/admin',
                module: RouterHttpAdminModule,
            },
            {
                path: '/user',
                module: RouterHttpUserModule,
            },
            {
                path: '/shared',
                module: RouterHttpSharedModule,
            },
        ]),
    ],
})
export class RouterModule {}
