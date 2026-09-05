import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';

/**
 * Wires the Pino logger via `LoggerOptionService` for app-wide structured logging.
 */
@Module({})
export class LoggerModule {
    static forRoot(): DynamicModule {
        return {
            module: LoggerModule,
            imports: [
                PinoLoggerModule.forRootAsync({
                    providers: [LoggerOptionService],
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
