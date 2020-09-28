import { Module } from '@nestjs/common';
import { LoggerService } from 'middleware/logger/logger.service';

@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: []
})
export class LoggerModule {}
