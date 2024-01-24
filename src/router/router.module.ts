import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';
import { RouterModule as NestJsRouterModule } from '@nestjs/core';
import { RoutesAdminModule } from './routes/routes.admin.module';
import { RoutesUserModule } from 'src/router/routes/routes.user.module';
import { RoutesPublicModule } from 'src/router/routes/routes.public.module';
import { RoutesAuthModule } from 'src/router/routes/routes.auth.module';
import { RoutesServiceModule } from 'src/router/routes/routes.service.module';

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
                RoutesPublicModule,
                RoutesUserModule,
                RoutesAdminModule,
                RoutesAuthModule,
                RoutesServiceModule,
                NestJsRouterModule.register([
                    {
                        path: '/public',
                        module: RoutesPublicModule,
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
                        path: '/auth',
                        module: RoutesAuthModule,
                    },
                    {
                        path: '/service',
                        module: RoutesServiceModule,
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
