import { Global, Module } from '@nestjs/common';
import { LoggerRepositoryModule } from 'src/common/logger/repository/logger.repository.module';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
    providers: [LoggerService],
    exports: [LoggerService],
    imports: [LoggerRepositoryModule],
})
export class LoggerModule {}
