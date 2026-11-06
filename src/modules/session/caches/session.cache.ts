import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import type KeyvRedis from '@keyv/redis';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import type {
    ISessionCache,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';

@Injectable()
export class SessionCache {
    private readonly loginKeyPattern: string;
    private readonly loginTtlInMs: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        @Inject(RedisClientCachedProvider) private readonly keyv: Keyv,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService
    ) {
        this.loginKeyPattern =
            this.configService.get<string>('session.keyPattern')!;
        this.loginTtlInMs = this.configService.get<number>(
            'session.loginCacheTtlInMs'
        )!;
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

    /** Stores a login session for the access-token lifetime; the entry holds the SHA-256 digest of the jti, never the jti. */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        const key = this.buildLoginKey(userId, sessionId);
        const jtiDigest = this.helperHashService.sha256Hash(jti);
        await this.cacheManager.set<ISessionCache>(
            key,
            {
                userId,
                sessionId,
                jtiDigest,
            },
            this.loginTtlInMs
        );
    }

    /** Compare-and-set in one Lua script: rotates the stored jti digest and resets the access-token TTL only while the entry holds the old digest; answers the outcome: updated, absent (no entry, or it expired before the write), or mismatch. */
    async updateLogin(
        userId: string,
        sessionId: string,
        oldJti: string,
        newJti: string
    ): Promise<EnumSessionCacheUpdate> {
        const store = this.getStore();
        const sessionKey = this.buildLoginKey(userId, sessionId);
        const key = store.createKeyPrefix(sessionKey, store.namespace);
        const now = this.helperDateService.create();
        const oldJtiDigest = this.helperHashService.sha256Hash(oldJti);
        const newJtiDigest = this.helperHashService.sha256Hash(newJti);
        const [value, client] = await Promise.all([
            this.keyv.serializeData<ISessionCache>({
                value: { userId, sessionId, jtiDigest: newJtiDigest },
                expires: now.getTime() + this.loginTtlInMs,
            }),
            store.getClient(),
        ]);
        const reply = await client.eval(
            `
local raw = redis.call('GET', KEYS[1])
if not raw then
    return 'absent'
end
local entry = cjson.decode(raw)
if entry.value.jtiDigest ~= ARGV[1] then
    return 'mismatch'
end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
return 'updated'
`,
            {
                keys: [key],
                arguments: [
                    oldJtiDigest,
                    value as string,
                    `${this.loginTtlInMs}`,
                ],
            }
        );

        if (reply === EnumSessionCacheUpdate.updated) {
            return EnumSessionCacheUpdate.updated;
        }

        return reply === EnumSessionCacheUpdate.mismatch
            ? EnumSessionCacheUpdate.mismatch
            : EnumSessionCacheUpdate.absent;
    }

    async deleteLogins(userId: string, sessions: ISessionRef[]): Promise<void> {
        if (sessions.length === 0) {
            return;
        }

        await this.cacheManager.mdel(
            sessions.map(session => this.buildLoginKey(userId, session.id))
        );
    }
}
