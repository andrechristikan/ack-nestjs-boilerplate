import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';

/**
 * Module providing logger configuration options service.
 * Exports LoggerService for use in other modules requiring logger configuration.
 */
@Module({})
export class LoggerModule {
    /**
     * Creates and configures the logger module with Pino logger integration.
     * Sets up async configuration using LoggerOptionService.
     *
     * @returns {DynamicModule} Configured dynamic module with Pino logger
     */
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
