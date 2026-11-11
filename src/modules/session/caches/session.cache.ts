import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import type {
    ISessionCache,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

@Injectable()
export class SessionCache {
    private readonly loginKeyPattern: string;
    private readonly loginTtlInMs: number;

    constructor(
        @Inject(RedisCacheClient) private readonly redis: Redis,
        private readonly configService: ConfigService,
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

    /** Reads the login entry through the cache client; a Redis failure throws. */
    async getLogin(
        userId: string,
        sessionId: string
    ): Promise<ISessionCache | null> {
        const key = this.buildLoginKey(userId, sessionId);
        const raw = await this.redis.get(key);

        return raw === null ? null : JSON.parse(raw);
    }

    /** Stores a login session for the access-token lifetime; the entry holds the SHA-256 digest of the jti, never the jti. */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        const key = this.buildLoginKey(userId, sessionId);
        const jtiDigest = this.helperHashService.sha256Hash(jti);
        const entry: ISessionCache = { userId, sessionId, jtiDigest };
        await this.redis.set(
            key,
            JSON.stringify(entry),
            'PX',
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
        const key = this.buildLoginKey(userId, sessionId);
        const oldJtiDigest = this.helperHashService.sha256Hash(oldJti);
        const newJtiDigest = this.helperHashService.sha256Hash(newJti);
        const entry: ISessionCache = {
            userId,
            sessionId,
            jtiDigest: newJtiDigest,
        };
        const reply = await this.redis.eval(
            `
                local raw = redis.call('GET', KEYS[1])
                if not raw then
                    return 'absent'
                end
                local entry = cjson.decode(raw)
                if entry.jtiDigest ~= ARGV[1] then
                    return 'mismatch'
                end
                redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
                return 'updated'
            `,
            1,
            key,
            oldJtiDigest,
            JSON.stringify(entry),
            `${this.loginTtlInMs}`
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

        await this.redis.unlink(
            ...sessions.map(session => this.buildLoginKey(userId, session.id))
        );
    }
}
