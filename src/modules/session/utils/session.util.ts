import { HelperService } from '@common/helper/services/helper.service';
import { RedisClientType } from '@keyv/redis';
import { SESSION_CACHE_MANAGER } from '@modules/session/constants/session.constant';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';

@Injectable()
export class SessionUtil implements OnModuleInit {
    private readonly logger = new Logger(SessionUtil.name);
    private redisClient: RedisClientType;

    private readonly keyPattern: string;
    private readonly namespace: string;

    constructor(
        @Inject(SESSION_CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.keyPattern = this.configService.get<string>('session.keyPattern')!;
        this.namespace = this.configService.get<string>('session.namespace')!;
    }

    async onModuleInit(): Promise<void> {
        this.extractRedisClient();
    }

    private extractRedisClient(): void {
        const stores = this.cacheManager.stores;

        if (stores.length === 0) {
            this.logger.warn('No cache stores found');
        } else {
            const store = (stores[0] as Keyv).store;
            this.redisClient = store.client;
        }

        if (!this.redisClient) {
            this.logger.warn('Keyv instance not found');
        } else {
            this.logger.log('Keyv instance extracted successfully');
        }
    }

    async getLogin(userId: string, sessionId: string): Promise<boolean> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        const cached = await this.cacheManager.get<string>(key);

        return !!cached;
    }

    async setLogin(
        userId: string,
        sessionId: string,
        expiredAt: Date
    ): Promise<void> {
        const key = `${this.keyPattern}:${userId}:${sessionId}`;
        const ttl = Math.floor(
            (expiredAt.getTime() - this.helperService.dateCreate().getTime()) /
                1000
        );

        await this.cacheManager.set(
            key,
            {
                userId,
                sessionId,
                createdAt: this.helperService.dateCreate(),
                expiredAt,
            },
            ttl
        );

        return;
    }

    async deleteOneLogin(userId: string, sessionId: string): Promise<void> {
        const key = `${this.keyPattern}:${userId}:${sessionId}`;
        await this.cacheManager.del(key);

        return;
    }

    async deleteAllLogins(userId: string): Promise<void> {
        const pattern = `${this.namespace}:${this.keyPattern}:${userId}:*`;

        let cursor = 0;
        const keys = [];

        do {
            const result = await this.redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100,
            });
            cursor = result.cursor;
            keys.push(...result.keys);
        } while (cursor !== 0);

        if (keys.length > 0) {
            await this.cacheManager.mdel(keys);
        }

        return;
    }

    async flushAll(): Promise<void> {
        this.cacheManager.clear();
    }
}
