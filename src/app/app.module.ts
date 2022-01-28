import { Module } from '@nestjs/common';
import { RouterCommonModule } from 'src/router/router.common.module';
import { RouterModule } from '@nestjs/core';
import { RouterTestModule } from 'src/router/router.test.module';
import { RouterEnumModule } from 'src/router/router.enum.module';
import { RouterPublicModule } from 'src/router/router.public.module';
import { RouterAdminModule } from 'src/router/router.admin.module';
import { RouterCallbackModule } from 'src/router/router.callback.module';
import { CoreModule } from 'src/core/core.module';

@Module({
    controllers: [],
    providers: [],
    imports: [
        // Core
        CoreModule,

        // Router
        RouterCommonModule,
        RouterTestModule,
        RouterEnumModule,
        RouterPublicModule,
        RouterAdminModule,
        RouterCallbackModule,
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
            {
                path: '/callback',
                module: RouterCallbackModule,
            },
        ]),
    ],
})
export class AppModule {}
