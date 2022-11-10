import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';
import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { RoutesAdminModule } from './routes/routes.admin.module';
import { RoutesCallbackModule } from './routes/routes.callback.module';
import { RoutesEnumModule } from './routes/routes.enum.module';
import { RoutesModule } from './routes/routes.module';
import { RoutesPublicModule } from './routes/routes.public.module';
import { RoutesTestModule } from './routes/routes.test.module';

@Module({})
export class RouterModule {
    static forRoot(): DynamicModule {
        const imports: (
            | DynamicModule
            | Type<any>
            | Promise<DynamicModule>
            | ForwardReference<any>
        )[] = [];

        if (process.env.HTTP_ENABLE === 'true') {
            imports.push(
                RoutesModule,
                RoutesTestModule,
                RoutesEnumModule,
                RoutesPublicModule,
                RoutesAdminModule,
                RoutesCallbackModule,
                NestJsRouterModule.register([
                    {
                        path: '/',
                        module: RoutesModule,
                    },
                    {
                        path: '/test',
                        module: RoutesTestModule,
                    },
                    {
                        path: '/enum',
                        module: RoutesEnumModule,
                    },
                    {
                        path: '/public',
                        module: RoutesPublicModule,
                    },
                    {
                        path: '/admin',
                        module: RoutesAdminModule,
                    },
                    {
                        path: '/callback',
                        module: RoutesCallbackModule,
                    },
                ])
            );
        }

        return {
            module: RouterModule,
            providers: [],
            exports: [],
            controllers: [],
            imports,
        };
    }
}
