import { DynamicModule, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { RouterAdminModule } from 'src/router/router.admin.module';
import { RouterCallbackModule } from 'src/router/router.callback.module';
import { RouterCommonModule } from 'src/router/router.common.module';
import { RouterEnumModule } from 'src/router/router.enum.module';
import { RouterPublicModule } from 'src/router/router.public.module';
import { RouterTestModule } from 'src/router/router.test.module';

@Module({})
export class AppRouterModule {
    static register(): DynamicModule {
        if (process.env.APP_HTTP_ON === 'true') {
            return {
                module: AppRouterModule,
                controllers: [],
                providers: [],
                exports: [],
                imports: [
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
            };
        }

        return {
            module: AppRouterModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
