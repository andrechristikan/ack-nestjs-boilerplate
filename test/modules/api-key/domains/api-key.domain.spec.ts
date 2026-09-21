import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
    type ApiKey,
} from '@generated/prisma-client';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyStartAtNotFutureException } from '@modules/api-key/exceptions/api-key.start-at-not-future.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';
import { ApiKeyXApiKeyPredefinedNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-predefined-not-found.exception';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';

describe('ApiKeyDomain', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const apiKeyCredentialUtil: MockProxy<ApiKeyCredentialUtil> =
        mock<ApiKeyCredentialUtil>();
    const apiKeyCache: MockProxy<ApiKeyCache> = mock<ApiKeyCache>();
    const apiKeyRepository: MockProxy<ApiKeyRepository> =
        mock<ApiKeyRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const now = new Date('2026-01-01T12:00:00.000Z');
    const apiKey = {
        id: 'api-key-id',
        type: EnumApiKeyType.default,
        name: 'Public API',
        key: 'production_public-key',
        hash: 'stored-hash',
        isActive: true,
        startAt: new Date('2025-01-01T00:00:00.000Z'),
        endAt: new Date('2027-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies ApiKey;

    let service: ApiKeyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue({
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            apiKeyType: apiKey.type,
            timestamp: apiKey.updatedAt,
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyDomain,
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                {
                    provide: ApiKeyCredentialUtil,
                    useValue: apiKeyCredentialUtil,
                },
                { provide: ApiKeyCache, useValue: apiKeyCache },
                { provide: ApiKeyRepository, useValue: apiKeyRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        service = moduleRef.get(ApiKeyDomain);
    });

    describe('findOneActiveByKeyAndCache', () => {
        it('returns a cache hit without querying persistence', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);

            await expect(
                service.findOneActiveByKeyAndCache(apiKey.key)
            ).resolves.toBe(apiKey);
            expect(apiKeyRepository.findOneByKey).not.toHaveBeenCalled();
        });

        it('caches and returns a persistence hit', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(apiKey);

            await expect(
                service.findOneActiveByKeyAndCache(apiKey.key)
            ).resolves.toBe(apiKey);
            expect(apiKeyCache.setCacheByKey).toHaveBeenCalledWith(
                apiKey.key,
                apiKey
            );
        });

        it('returns a persistence miss without caching it', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(null);

            await expect(
                service.findOneActiveByKeyAndCache('unknown')
            ).resolves.toBeNull();
            expect(apiKeyCache.setCacheByKey).not.toHaveBeenCalled();
        });
    });

    describe('validateXApiKey', () => {
        it.each([null, '', '   '])(
            'rejects a missing credential header',
            async header => {
                await expect(
                    service.validateXApiKey(header)
                ).rejects.toBeInstanceOf(ApiKeyXApiKeyRequiredException);
            }
        );

        it.each(['key', 'key:', ':secret', 'key:secret:extra'])(
            'rejects malformed credential %s',
            async header => {
                await expect(
                    service.validateXApiKey(header)
                ).rejects.toBeInstanceOf(ApiKeyXApiKeyInvalidException);
            }
        );

        it('rejects an unknown public key before secret verification', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(null);

            await expect(
                service.validateXApiKey('unknown:secret')
            ).rejects.toBeInstanceOf(ApiKeyXApiKeyNotFoundException);
            expect(
                apiKeyCredentialUtil.validateCredential
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['secret mismatch', false, true],
            ['inactive or out-of-window key', true, false],
        ])('rejects a %s', async (_case, credentialValid, keyValid) => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(
                credentialValid
            );
            apiKeyUtil.isValid.mockReturnValue(keyValid);

            await expect(
                service.validateXApiKey(`${apiKey.key}:secret`)
            ).rejects.toBeInstanceOf(ApiKeyXApiKeyInvalidException);
        });

        it('returns an active in-window key with a valid secret', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isValid.mockReturnValue(true);

            await expect(
                service.validateXApiKey(`${apiKey.key}:secret`)
            ).resolves.toBe(apiKey);
            expect(
                apiKeyCredentialUtil.validateCredential
            ).toHaveBeenCalledWith(apiKey.key, 'secret', apiKey);
        });
    });

    describe('administration', () => {
        it('delegates the administrator list filters', async () => {
            const pagination = { limit: 20, page: 1, skip: 0 };
            const isActive = { isActive: { equals: true } };
            const type = { type: { in: [EnumApiKeyType.default] } };
            const page = mock<IResponsePaginationReturn<never>>();
            apiKeyRepository.findWithPagination.mockResolvedValue(page);

            await expect(
                service.getListByAdmin(pagination, isActive, type)
            ).resolves.toBe(page);
            expect(apiKeyRepository.findWithPagination).toHaveBeenCalledWith(
                pagination,
                isActive,
                type
            );
        });

        it('rejects creation when the start date is not in the future', async () => {
            await expect(
                service.createByAdmin({
                    name: 'Public API',
                    type: EnumApiKeyType.default,
                    startAt: now,
                    endAt: new Date('2027-01-01T00:00:00.000Z'),
                })
            ).rejects.toBeInstanceOf(ApiKeyStartAtNotFutureException);
            expect(apiKeyRepository.create).not.toHaveBeenCalled();
        });

        it('creates a bounded key with normalized dates and stages its audit event', async () => {
            const startAt = new Date('2026-02-01T12:00:00.000Z');
            const endAt = new Date('2026-03-01T12:00:00.000Z');
            const startAtDay = new Date('2026-02-01T00:00:00.000Z');
            const endAtDay = new Date('2026-03-01T23:59:59.999Z');
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyCredentialUtil.generateCredential.mockReturnValue({
                key: apiKey.key,
                secret: 'secret',
                hash: apiKey.hash,
            });
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(startAtDay)
                .mockReturnValueOnce(endAtDay);
            apiKeyRepository.create.mockResolvedValue(apiKey);

            await expect(
                service.createByAdmin({
                    name: apiKey.name,
                    type: apiKey.type,
                    startAt,
                    endAt,
                })
            ).resolves.toEqual({ apiKey, secret: 'secret' });
            expect(helperDateService.create).toHaveBeenNthCalledWith(
                3,
                startAt,
                { dayOf: EnumHelperDateDayOf.start }
            );
            expect(helperDateService.create).toHaveBeenNthCalledWith(4, endAt, {
                dayOf: EnumHelperDateDayOf.end,
            });
            expect(apiKeyRepository.create).toHaveBeenCalledWith(
                apiKey.id,
                {
                    name: apiKey.name,
                    type: apiKey.type,
                    startAt: startAtDay,
                    endAt: endAtDay,
                },
                apiKey.key,
                apiKey.hash
            );
        });

        it('creates an unbounded key without normalizing dates', async () => {
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyCredentialUtil.generateCredential.mockReturnValue({
                key: apiKey.key,
                secret: 'secret',
                hash: apiKey.hash,
            });
            apiKeyRepository.create.mockResolvedValue(apiKey);

            await service.createByAdmin({
                name: apiKey.name,
                type: apiKey.type,
            });

            expect(apiKeyRepository.create).toHaveBeenCalledWith(
                apiKey.id,
                {
                    name: apiKey.name,
                    type: apiKey.type,
                    startAt: undefined,
                    endAt: undefined,
                },
                apiKey.key,
                apiKey.hash
            );
        });

        it('rejects a status change for an unknown key', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateStatusByAdmin('unknown', false)
            ).rejects.toBeInstanceOf(ApiKeyNotFoundException);
        });

        it('rejects a status change for an expired key', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(true);

            await expect(
                service.updateStatusByAdmin(apiKey.id, false)
            ).rejects.toBeInstanceOf(ApiKeyExpiredException);
            expect(apiKeyRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('updates status and invalidates the cached credential', async () => {
            const updated = { ...apiKey, isActive: false };
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(false);
            apiKeyRepository.updateStatus.mockResolvedValue(updated);

            await expect(
                service.updateStatusByAdmin(apiKey.id, false)
            ).resolves.toBe(updated);
            expect(apiKeyRepository.updateStatus).toHaveBeenCalledWith(
                apiKey.id,
                { isActive: false }
            );
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
        });

        it('updates a key name and invalidates its cached credential', async () => {
            const updated = { ...apiKey, name: 'Renamed' };
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            apiKeyRepository.updateName.mockResolvedValue(updated);

            await expect(
                service.updateByAdmin(apiKey.id, 'Renamed')
            ).resolves.toBe(updated);
            expect(apiKeyRepository.updateName).toHaveBeenCalledWith(
                apiKey.id,
                'Renamed'
            );
        });

        it('stages an update without persisting when the name is omitted', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);

            await expect(service.updateByAdmin(apiKey.id)).resolves.toBe(
                apiKey
            );
            expect(apiKeyRepository.updateName).not.toHaveBeenCalled();
        });

        it.each([
            ['missing', null, true, ApiKeyNotFoundException],
            ['inactive', apiKey, false, ApiKeyInactiveException],
        ])(
            'rejects an update for a %s key',
            async (_case, found, isActive, ExceptionClass) => {
                apiKeyRepository.findOneById.mockResolvedValue(found);
                apiKeyUtil.isActive.mockReturnValue(isActive);

                await expect(
                    service.updateByAdmin(apiKey.id, 'Renamed')
                ).rejects.toBeInstanceOf(ExceptionClass);
            }
        );

        it('updates normalized key dates and invalidates its cache entry', async () => {
            const startAt = new Date('2026-02-01T12:00:00.000Z');
            const endAt = new Date('2026-03-01T12:00:00.000Z');
            const startAtDay = new Date('2026-02-01T00:00:00.000Z');
            const endAtDay = new Date('2026-03-01T23:59:59.999Z');
            const updated = { ...apiKey, startAt: startAtDay, endAt: endAtDay };
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(startAtDay)
                .mockReturnValueOnce(endAtDay)
                .mockReturnValueOnce(now);
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            apiKeyRepository.updateDates.mockResolvedValue(updated);

            await expect(
                service.updateDatesByAdmin(apiKey.id, startAt, endAt)
            ).resolves.toBe(updated);
            expect(apiKeyRepository.updateDates).toHaveBeenCalledWith(
                apiKey.id,
                { startAt: startAtDay, endAt: endAtDay }
            );
        });

        it('rotates the secret hash and invalidates the old cached credential', async () => {
            const updated = { ...apiKey, hash: 'new-hash' };
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            apiKeyCredentialUtil.createSecret.mockReturnValue('new-secret');
            apiKeyCredentialUtil.createHash.mockReturnValue('new-hash');
            apiKeyRepository.updateHash.mockResolvedValue(updated);

            await expect(service.resetByAdmin(apiKey.id)).resolves.toEqual({
                apiKey: updated,
                secret: 'new-secret',
            });
            expect(apiKeyCredentialUtil.createHash).toHaveBeenCalledWith(
                apiKey.key,
                'new-secret'
            );
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
        });

        it('deletes a key and invalidates its cached credential', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyRepository.delete.mockResolvedValue(apiKey);

            await expect(service.deleteByAdmin(apiKey.id)).resolves.toBe(
                apiKey
            );
            expect(apiKeyRepository.delete).toHaveBeenCalledWith(apiKey.id);
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyDelete,
                metadata: expect.any(Object),
                onError: true,
            });
        });

        it('rejects deletion of an unknown key', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.deleteByAdmin('unknown')
            ).rejects.toBeInstanceOf(ApiKeyNotFoundException);
        });
    });

    describe('validateXApiKeyTypeGuard', () => {
        it('rejects a route without predefined allowed key types', () => {
            expect(() => service.validateXApiKeyTypeGuard(apiKey, [])).toThrow(
                ApiKeyXApiKeyPredefinedNotFoundException
            );
        });

        it('rejects a key outside the route allow-list', () => {
            apiKeyUtil.validateType.mockReturnValue(false);

            expect(() =>
                service.validateXApiKeyTypeGuard(apiKey, [
                    EnumApiKeyType.system,
                ])
            ).toThrow(ApiKeyXApiKeyForbiddenException);
        });

        it('rejects a missing key for a route with predefined types', () => {
            expect(() =>
                service.validateXApiKeyTypeGuard(null, [EnumApiKeyType.default])
            ).toThrow(ApiKeyXApiKeyForbiddenException);
        });

        it('accepts a key whose type is allowed', () => {
            apiKeyUtil.validateType.mockReturnValue(true);

            expect(
                service.validateXApiKeyTypeGuard(apiKey, [
                    EnumApiKeyType.default,
                ])
            ).toBe(true);
        });
    });
});
