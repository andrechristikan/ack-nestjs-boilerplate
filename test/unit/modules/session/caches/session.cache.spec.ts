import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('SessionCache', () => {
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

    let cache: SessionCache;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'session.keyPattern': 'Session:{userId}:{sessionId}',
                'session.loginCacheTtlInMs': 900000,
            };
            return values[key];
        });
        helperStringService.fillPattern.mockImplementation((_pattern, tokens) =>
            Object.values(tokens).join(':')
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionCache,
                { provide: RedisCacheClient, useValue: redis },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();

        cache = module.get(SessionCache);
    });

    describe('getLogin', () => {
        it('returns the login session parsed from the JSON entry under the unprefixed key', async () => {
            const session: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                jtiDigest: 'jti-digest',
            };
            redis.get.mockResolvedValue(
                '{"userId":"user-1","sessionId":"session-1","jtiDigest":"jti-digest"}'
            );

            const result = await cache.getLogin('user-1', 'session-1');

            expect(result).toEqual(session);
            expect(redis.get).toHaveBeenCalledWith('user-1:session-1');
        });

        it('returns null when no login is cached', async () => {
            redis.get.mockResolvedValue(null);

            const result = await cache.getLogin('user-1', 'session-1');

            expect(result).toBeNull();
        });

        it('propagates a Redis failure instead of reporting a miss', async () => {
            const failure = new Error('Connection is closed.');
            redis.get.mockRejectedValue(failure);

            await expect(cache.getLogin('user-1', 'session-1')).rejects.toBe(
                failure
            );
        });
    });

    describe('setLogin', () => {
        it('stores the login session as JSON with the access-token lifetime as PX and the jti digest, never the raw jti', async () => {
            helperHashService.sha256Hash.mockImplementation(
                value => `hash(${value})`
            );

            await cache.setLogin('user-1', 'session-1', 'jti-value');

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'jti-value'
            );
            expect(redis.set).toHaveBeenCalledWith(
                'user-1:session-1',
                '{"userId":"user-1","sessionId":"session-1","jtiDigest":"hash(jti-value)"}',
                'PX',
                900000
            );
        });
    });

    describe('updateLogin', () => {
        beforeEach(() => {
            helperHashService.sha256Hash.mockImplementation(
                value => `hash(${value})`
            );
        });

        it('sends one compare-and-set script with the old jti digest and the rotated JSON entry, answering updated when the script replies updated', async () => {
            redis.eval.mockResolvedValue(EnumSessionCacheUpdate.updated);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.updated);
            expect(redis.eval).toHaveBeenCalledWith(
                expect.any(String),
                1,
                'user-1:session-1',
                'hash(old-jti)',
                '{"userId":"user-1","sessionId":"session-1","jtiDigest":"hash(new-jti)"}',
                '900000'
            );
            expect(redis.get).not.toHaveBeenCalled();
        });

        it('compares the jtiDigest field of the stored entry inside the compare-and-set script', async () => {
            redis.eval.mockResolvedValue(EnumSessionCacheUpdate.updated);

            await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(redis.eval).toHaveBeenCalledWith(
                expect.stringContaining('entry.jtiDigest ~= ARGV[1]'),
                1,
                'user-1:session-1',
                'hash(old-jti)',
                expect.any(String),
                '900000'
            );
        });

        it('answers mismatch when the script finds another jti digest', async () => {
            redis.eval.mockResolvedValue(EnumSessionCacheUpdate.mismatch);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'other-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.mismatch);
        });

        it('answers absent when the script finds no entry', async () => {
            redis.eval.mockResolvedValue(EnumSessionCacheUpdate.absent);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.absent);
        });

        it('answers absent for any other script reply', async () => {
            redis.eval.mockResolvedValue(null);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.absent);
        });
    });

    describe('deleteLogins', () => {
        it('unlinks exactly the given session entries in one command', async () => {
            await cache.deleteLogins('user-1', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            expect(redis.unlink).toHaveBeenCalledTimes(1);
            expect(redis.unlink).toHaveBeenCalledWith(
                'user-1:session-1',
                'user-1:session-2'
            );
        });

        it('issues no command for an empty session list', async () => {
            await cache.deleteLogins('user-1', []);

            expect(redis.unlink).not.toHaveBeenCalled();
        });
    });

    describe('buildLoginKey', () => {
        it('fills the configured key pattern with the user and session ids', () => {
            const result = cache['buildLoginKey']('user-1', 'session-1');

            expect(result).toBe('user-1:session-1');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Session:{userId}:{sessionId}',
                { userId: 'user-1', sessionId: 'session-1' }
            );
        });
    });
});
