import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsRouterModule } from './router/jobs.router.module';

@Module({})
export class JobsModule {
    static forRoot(): DynamicModule {
        const imports: (
            | DynamicModule
            | Type<any>
            | Promise<DynamicModule>
            | ForwardReference<any>
        )[] = [];

        if (process.env.JOB_ENABLE === 'true') {
            imports.push(ScheduleModule.forRoot(), JobsRouterModule);
        }

        return {
            module: JobsModule,
            providers: [],
            exports: [],
            controllers: [],
            imports,
        };
    }
}
