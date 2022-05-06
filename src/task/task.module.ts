import { DynamicModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({})
export class TaskModule {
    static register(): DynamicModule {
        if (process.env.APP_TASK_ON === 'true') {
            return {
                module: TaskModule,
                controllers: [],
                providers: [],
                exports: [],
                imports: [ScheduleModule.forRoot()],
            };
        }

        return {
            module: TaskModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
