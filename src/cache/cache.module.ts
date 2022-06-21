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
    providers: [CacheService],
    exports: [CacheService],
    imports: [
        NestJsCacheModule.registerAsync({
            useClass: CacheOptionsService,
        }),
    ],
})
export class CacheModule {}
