import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { CacheService } from '@common/cache/services/cache.service';

@Module({})
export class CacheModule {
    static forRoot(): DynamicModule {
        return {
            module: CacheModule,
            global: true,
            providers: [CacheService],
            exports: [CacheService],
        };
    }
}
