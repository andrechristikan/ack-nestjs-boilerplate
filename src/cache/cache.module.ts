import {
    CacheModule as NestJsCacheModule,
    Global,
    Module,
} from '@nestjs/common';
import { CacheOptionsService } from './service/cache.options.service';
import { CacheService } from './service/cache.service';

@Global()
@Module({
    controllers: [],
    providers: [CacheOptionsService, CacheService],
    exports: [CacheOptionsService, CacheService],
    imports: [
        NestJsCacheModule.registerAsync({
            inject: [CacheOptionsService],
            imports: [CacheModule],
            useFactory: (cacheOptionsService: CacheOptionsService) =>
                cacheOptionsService.createCacheOptions(),
        }),
    ],
})
export class CacheModule {}
