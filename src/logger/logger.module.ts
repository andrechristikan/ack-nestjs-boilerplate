import { Global, Module } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';

@Global()
@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: []
})
export class LoggerModule {}
