import { Module } from '@nestjs/common';
import { ConfigService } from 'common/config/config.service';

@Module({
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule {}
