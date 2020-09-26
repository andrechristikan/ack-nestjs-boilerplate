import { Global, Module } from '@nestjs/common';
import { ConfigService } from 'config/config.service';

@Global()
@Module({
    providers: [
        {
            provide: 'ConfigService',
            useClass: ConfigService
        }
    ],
    exports: ['ConfigService'],
    imports: []
})
export class ConfigModule {}
