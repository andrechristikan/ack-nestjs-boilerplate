import { DynamicModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({})
export class TaskScheduleModule {
    static register(): DynamicModule {
        if (process.env.APP_TASK_ON === 'true') {
            return {
                module: TaskScheduleModule,
                controllers: [],
                providers: [],
                exports: [],
                imports: [ScheduleModule.forRoot()],
            };
        }

        return {
            module: TaskScheduleModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
