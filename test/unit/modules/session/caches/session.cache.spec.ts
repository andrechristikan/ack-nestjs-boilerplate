import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SessionCache } from '@modules/session/caches/session.cache';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { SessionLoginCacheSchema } from '@modules/session/dtos/session.login-cache.dto';

describe('SessionCache', () => {
    const configValues = {
        'session.keyPattern': 'User:{userId}:Session:{sessionId}',
        'session.loginCacheTtlInMs': 900000,
    };
    let configService: MockProxy<ConfigService>;

    let cache: SessionCache;

    beforeEach(async () => {
        configService = buildConfigService(configValues);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionCache,
                { provide: ConfigService, useValue: configService },
                HelperStringService,
            ],
        }).compile();

        cache = module.get(SessionCache);
    });

    describe('loginCacheTtlInMs', () => {
        it('reads the TTL from session.loginCacheTtlInMs', () => {
            expect(cache.loginCacheTtlInMs).toBe(900000);
            expect(configService.get).toHaveBeenCalledWith(
                'session.loginCacheTtlInMs'
            );
        });
    });

    describe('buildLoginKey', () => {
        it('fills the key pattern with the user and session ids', () => {
            const key = cache.buildLoginKey('user-1', 'session-1');

            expect(key).toBe('User:user-1:Session:session-1');
        });
    });

    describe('SessionLoginCacheSchema', () => {
        it('parses a cached login holding the jti digest', () => {
            const parsed = SessionLoginCacheSchema.safeParse({
                jtiDigest: 'digest',
            });

            expect(parsed.success).toBe(true);
        });

        it('rejects an entry with no jti digest', () => {
            const parsed = SessionLoginCacheSchema.safeParse({});

            expect(parsed.error?.issues).toEqual([
                expect.objectContaining({
                    path: ['jtiDigest'],
                    code: 'invalid_type',
                }),
            ]);
        });
    });
});
