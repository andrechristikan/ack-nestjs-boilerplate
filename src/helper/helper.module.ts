import { Module } from '@nestjs/common';
import { ConfigModule } from 'config/config.module';
import { HelperService } from 'helper/helper.service';

@Module({
    providers: [HelperService],
    exports: [HelperService],
    imports: [ConfigModule],
})
export class HelperModule {}
