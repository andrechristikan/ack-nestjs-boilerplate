import { Global, Module } from '@nestjs/common';
import { ConfigModule } from 'config/config.module';
import { HelperService } from 'helper/helper.service';

@Global()
@Module({
    providers: [
        {
            provide: 'HelperService',
            useClass: HelperService
        }
    ],
    exports: ['HelperService'],
    imports: [ConfigModule]
})
export class HelperModule {}
