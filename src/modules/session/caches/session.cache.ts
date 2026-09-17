import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import type KeyvRedis from '@keyv/redis';
import {
    SessionCacheProvider,
    SessionCachePurgeScanCount,
} from '@modules/session/constants/session.constant';
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
    private readonly keyPattern: string;

    constructor(
        @Inject(SessionCacheProvider) private cacheManager: Cache,
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.keyPattern = this.configService.get<string>('session.keyPattern')!;
    }

    private buildKey(userId: string, sessionId: string): string {
        return this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
    }

    private getStore(): KeyvRedis<string> {
        return this.keyv.store as KeyvRedis<string>;
    }

    async getLogin(
        userId: string,
        sessionId: string
    ): Promise<ISessionCache | null> {
        const cached = await this.cacheManager.get<ISessionCache>(
            this.buildKey(userId, sessionId)
        );

        return cached ?? null;
    }

    /** Stores a new login session with TTL derived from its expiry. */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string,
        expiredAt: Date
    ): Promise<void> {
        const ttl = Math.floor(
            expiredAt.getTime() - this.helperDateService.create().getTime()
        );

        await this.cacheManager.set<ISessionCache>(
            this.buildKey(userId, sessionId),
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
        const key = store.createKeyPrefix(
            this.buildKey(userId, sessionId),
            store.namespace
        );
        const value = await this.keyv.serializeData<ISessionCache>({
            value: { ...session, jti },
            expires: this.helperDateService.create().getTime() + expiredInMs,
        });
        const client = await store.getClient();
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
            sessions.map(session => this.buildKey(userId, session.id))
        );
    }

    /** Deletes every session login entry of a user, found by `SCAN` on the shared client. */
    async deleteLoginsByUser(userId: string): Promise<void> {
        const store = this.getStore();
        const match = store.createKeyPrefix(
            this.buildKey(userId, '*'),
            store.namespace
        );
        const clients = await store.getMasterNodes();
        for (const client of clients) {
            for await (const keys of client.scanIterator({
                MATCH: match,
                COUNT: SessionCachePurgeScanCount,
                TYPE: 'string',
            })) {
                if (keys.length > 0) {
                    await client.unlink(keys);
                }
            }
        }
    }
}
