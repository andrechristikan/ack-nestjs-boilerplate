import { createMock } from '@golevelup/ts-vitest';
import type { Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';
import { SessionCache } from '@modules/session/caches/session.cache';

describe('SessionCache', () => {
    const cacheManager = createMock<Cache>();
    const cacheSet = cacheManager.set;
    const cacheMdel = cacheManager.mdel;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;

    let service: SessionCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        cacheManager.set.mockImplementation(
            async <T>(_key: string, value: T): Promise<T> => value
        );
        cacheManager.get.mockResolvedValue(undefined);
        cacheManager.del.mockResolvedValue(true);
        cacheManager.mdel.mockResolvedValue(true);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                SessionCache,
                { provide: SessionCacheProvider, useValue: cacheManager },
                {
                    provide: ConfigService,
                    useValue: new ConfigService({
                        'session.keyPattern': 'session:{userId}:{sessionId}',
                    }),
                },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = moduleRef.get(SessionCache);
    });

    it('stores a login with TTL derived from its absolute expiry', async () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const expiredAt = new Date('2026-01-01T00:01:00.500Z');
        helperDateService.create.mockReturnValue(now);

        await service.setLogin('user-id', 'session-id', 'jti', expiredAt);

        expect(cacheSet).toHaveBeenCalledWith(
            'session:user-id:session-id',
            {
                userId: 'user-id',
                sessionId: 'session-id',
                expiredAt,
                jti: 'jti',
            },
            60_500
        );
    });

    it('rotates only the cached jti and applies the remaining refreshInTx lifetime', async () => {
        const session = {
            userId: 'user-id',
            sessionId: 'session-id',
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            jti: 'old-jti',
        } satisfies ISessionCache;

        await service.updateLogin(
            'user-id',
            'session-id',
            session,
            'new-jti',
            120_000
        );

        expect(cacheSet).toHaveBeenCalledWith(
            'session:user-id:session-id',
            { ...session, jti: 'new-jti' },
            120_000
        );
    });

    it('bulk-deletes only the supplied active session keys', async () => {
        await service.deleteAllLogins('user-id', [
            { id: 'session-1' },
            { id: 'session-2' },
        ]);

        expect(cacheMdel).toHaveBeenCalledWith([
            'session:user-id:session-1',
            'session:user-id:session-2',
        ]);
    });

    it('does not issue an empty bulk cache deletion', async () => {
        await service.deleteAllLogins('user-id', []);

        expect(cacheMdel).not.toHaveBeenCalled();
    });
});
