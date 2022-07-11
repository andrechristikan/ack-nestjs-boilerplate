import {
    CacheModule as NestJsCacheModule,
    Global,
    Module,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './service/cache.service';

@Global()
@Module({
    controllers: [],
    providers: [CacheService],
    exports: [CacheService],
    imports: [
        NestJsCacheModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) =>
                configService.get<Record<string, any>>('middleware.cache'),
            inject: [ConfigService],
        }),
    ],
})
export class CacheModule {}
