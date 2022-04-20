import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { RouterAdminModule } from 'src/router/router.admin.module';
import { RouterCommonModule } from 'src/router/router.common.module';
import { RouterEnumModule } from 'src/router/router.enum.module';
import { RouterPublicModule } from 'src/router/router.public.module';
import { RouterTestModule } from 'src/router/router.test.module';

@Module({
    controllers: [],
    providers: [],
    exports: [],
    imports: [
        RouterCommonModule,
        RouterTestModule,
        RouterEnumModule,
        RouterPublicModule,
        RouterAdminModule,
        RouterModule.register([
            {
                path: '/',
                module: RouterCommonModule,
            },
            {
                path: '/test',
                module: RouterTestModule,
            },
            {
                path: '/enum',
                module: RouterEnumModule,
            },
            {
                path: '/admin',
                module: RouterAdminModule,
            },
            {
                path: '/public',
                module: RouterPublicModule,
            },
        ]),
    ],
})
export class AppRouterModule {}
