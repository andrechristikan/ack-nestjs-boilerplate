import { DynamicModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsRouterModule } from './router/jobs.router.module';

@Module({})
export class JobsModule {
    static register(): DynamicModule {
        if (process.env.JOB_ENABLE === 'true') {
            return {
                module: JobsModule,
                controllers: [],
                providers: [],
                exports: [],
                imports: [ScheduleModule.forRoot(), JobsRouterModule],
            };
        }

        return {
            module: JobsModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
