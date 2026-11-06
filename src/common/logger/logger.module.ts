import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';
import { LoggerUtil } from '@common/logger/utils/logger.util';

@Module({})
export class LoggerModule {
    static forRoot(): DynamicModule {
        return {
            module: LoggerModule,
            imports: [
                PinoLoggerModule.forRootAsync({
                    providers: [LoggerOptionService, LoggerUtil],
                    inject: [LoggerOptionService],
                    useFactory: async (
                        loggerOptionService: LoggerOptionService
                    ) => {
                        return loggerOptionService.createOptions();
                    },
                }),
            ],
        };
    }
}
