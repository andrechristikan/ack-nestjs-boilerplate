import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import type KeyvRedis from '@keyv/redis';
import type {
    ISessionCache,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';

/** Manages TTL-based session cache entries. */
@Injectable()
export class SessionCache {
    private readonly loginKeyPattern: string;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        this.loginKeyPattern =
            this.configService.get<string>('session.keyPattern')!;
    }

    private buildLoginKey(userId: string, sessionId: string): string {
        return this.helperStringService.fillPattern(this.loginKeyPattern, {
            userId,
            sessionId,
        });
    }

    private getStore(): KeyvRedis<string> {
        return this.keyv.store as KeyvRedis<string>;
    }

    /** Reads the login entry through the Keyv client so a store failure throws; the cache manager would report it as a miss. */
    async getLogin(
        userId: string,
        sessionId: string
    ): Promise<ISessionCache | null> {
        const key = this.buildLoginKey(userId, sessionId);
        const cached = await this.keyv.get<ISessionCache>(key);

        return cached ?? null;
    }

    /** Stores a new login session with TTL derived from its expiry. */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string,
        expiredAt: Date
    ): Promise<void> {
        const now = this.helperDateService.create();
        const ttl = Math.floor(expiredAt.getTime() - now.getTime());

        const key = this.buildLoginKey(userId, sessionId);
        await this.cacheManager.set<ISessionCache>(
            key,
            {
                userId,
                sessionId,
                expiredAt,
                jti,
            },
            ttl
        );
    }

    /** Rotates the cached session's jti and resets its TTL only while the entry still exists; answers whether it wrote. */
    async updateLogin(
        userId: string,
        sessionId: string,
        session: ISessionCache,
        jti: string,
        expiredInMs: number
    ): Promise<boolean> {
        const store = this.getStore();
        const sessionKey = this.buildLoginKey(userId, sessionId);
        const key = store.createKeyPrefix(sessionKey, store.namespace);
        const now = this.helperDateService.create();
        const [value, client] = await Promise.all([
            this.keyv.serializeData<ISessionCache>({
                value: { ...session, jti },
                expires: now.getTime() + expiredInMs,
            }),
            store.getClient(),
        ]);
        const reply = await client.set(key, value as string, {
            expiration: { type: 'PX', value: expiredInMs },
            condition: 'XX',
        });

        return reply === 'OK';
    }

    /** Deletes exactly the given session login entries of a user. */
    async deleteLogins(userId: string, sessions: ISessionRef[]): Promise<void> {
        if (sessions.length === 0) {
            return;
        }

        await this.cacheManager.mdel(
            sessions.map(session => this.buildLoginKey(userId, session.id))
        );
    }
}
