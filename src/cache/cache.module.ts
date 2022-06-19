import {
    CacheModule as NestJsCacheModule,
    Global,
    Module,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './service/cache.service';

@Global()
@Module({
    imports: [
        NestJsCacheModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) =>
                configService.get<Record<string, any>>('middleware.cache'),

            inject: [ConfigService],
        }),
    ],
    providers: [CacheService],
    exports: [CacheService],
})
export class CacheModule {}
