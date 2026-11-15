import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SessionCache } from '@modules/session/caches/session.cache';
import { SessionLoginCacheSchema } from '@modules/session/constants/session.constant';

describe('SessionCache', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: SessionCache;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'session.keyPattern': 'User:{userId}:Session:{sessionId}',
                'session.loginCacheTtlInMs': 900000,
            };
            return values[key];
        });
        helperStringService.fillPattern.mockReturnValue(
            'User:user-1:Session:session-1'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionCache,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        cache = module.get(SessionCache);
    });

    describe('loginTtlInMs', () => {
        it('reads the TTL from session.loginCacheTtlInMs', () => {
            expect(cache.loginTtlInMs).toBe(900000);
            expect(configGet).toHaveBeenCalledWith('session.loginCacheTtlInMs');
        });
    });

    describe('buildLoginKey', () => {
        it('fills the key pattern with the user and session ids', () => {
            const key = cache.buildLoginKey('user-1', 'session-1');

            expect(key).toBe('User:user-1:Session:session-1');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'User:{userId}:Session:{sessionId}',
                { userId: 'user-1', sessionId: 'session-1' }
            );
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

            expect(parsed.success).toBe(false);
        });
    });
});
