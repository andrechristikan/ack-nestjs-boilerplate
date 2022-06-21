import {
    CacheModuleOptions,
    CacheOptionsFactory,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheOptionsService implements CacheOptionsFactory {
    private cacheConfig: Record<string, any>;
    constructor(private readonly configService: ConfigService) {
        this.cacheConfig =
            this.configService.get<Record<string, any>>('middleware.cache');
    }

    createCacheOptions(): CacheModuleOptions {
        return this.cacheConfig;
    }
}
