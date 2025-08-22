import { Module } from '@nestjs/common';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';

/**
 * Module providing logger configuration options service.
 * Exports LoggerOptionService for use in other modules requiring logger configuration.
 */
@Module({
    imports: [],
    providers: [LoggerOptionService],
    exports: [LoggerOptionService],
})
export class LoggerOptionModule {}
