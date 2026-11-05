import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultType,
} from '@modules/api-key/constants/api-key.list.constant';
import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyHttpService } from '@modules/api-key/services/http/api-key.http.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

describe('ApiKeyHttpService', () => {
    const apiKeyDomain: MockProxy<ApiKeyDomain> = mock<ApiKeyDomain>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const metadata = { apiKeyId: apiKey.id };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminApiKeyCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput> = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let service: ApiKeyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyHttpService,
                { provide: ApiKeyDomain, useValue: apiKeyDomain },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(ApiKeyHttpService);
    });

    describe('getListByAdmin', () => {
        it('parses the offset query, merges filters into the store, and wraps the domain page', async () => {
            const query: ApiKeyListRequestDto = {
                isActive: true,
                type: 'default',
            };
            const isActiveFilter = {
                where: { isActive: { equals: true } },
                storeFilter: { isActive: true },
            };
            const typeFilter = {
                where: { type: { in: [EnumApiKeyType.default] } },
                storeFilter: { type: [EnumApiKeyType.default] },
            };
            paginationFilterUtil.equalBoolean.mockReturnValue(isActiveFilter);
            paginationFilterUtil.inEnum.mockReturnValue(typeFilter);
            const page: IPaginationOffsetReturn<IApiKey> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [
                    {
                        id: apiKey.id,
                        type: apiKey.type,
                        name: apiKey.name,
                        key: apiKey.key,
                        isActive: apiKey.isActive,
                        startAt: apiKey.startAt,
                        endAt: apiKey.endAt,
                        createdAt: apiKey.createdAt,
                        createdBy: apiKey.createdBy,
                        updatedAt: apiKey.updatedAt,
                        updatedBy: apiKey.updatedBy,
                    },
                ],
            };
            apiKeyDomain.getListByAdmin.mockResolvedValue(page);

            const result = await service.getListByAdmin(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: ApiKeyDefaultAvailableSearch,
                availableOrderBy: ApiKeyDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.ApiKeyScalarFieldEnum.isActive,
                query.isActive
            );
            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                Prisma.ApiKeyScalarFieldEnum.type,
                query.type,
                ApiKeyDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        isActive: true,
                        type: [EnumApiKeyType.default],
                    },
                }
            );
            expect(apiKeyDomain.getListByAdmin).toHaveBeenCalledWith(
                pagination,
                isActiveFilter.where,
                typeFilter.where
            );
        });

        it('merges an empty filter set when isActive and type are both absent', async () => {
            const query: ApiKeyListRequestDto = {};
            paginationFilterUtil.equalBoolean.mockReturnValue(null);
            paginationFilterUtil.inEnum.mockReturnValue(null);
            const emptyPage: IPaginationOffsetReturn<IApiKey> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            apiKeyDomain.getListByAdmin.mockResolvedValue(emptyPage);

            await service.getListByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(apiKeyDomain.getListByAdmin).toHaveBeenCalledWith(
                pagination,
                undefined,
                undefined
            );
        });
    });

    describe('createByAdmin', () => {
        it('creates the api key and shapes the secret-bearing response', async () => {
            const body: ApiKeyCreateRequestDto = {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
            };
            apiKeyDomain.createByAdmin.mockResolvedValue({
                apiKey,
                secret: 'plain-secret',
            });
            const created = { ...apiKey, secret: 'plain-secret' };
            apiKeyUtil.mapCreate.mockReturnValue(created);
            databaseUtil.createId.mockReturnValue(apiKey.id);

            const result = await service.createByAdmin(body);

            expect(result).toEqual({ data: created });
            expect(apiKeyDomain.createByAdmin).toHaveBeenCalledWith(apiKey.id, {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
                startAt: null,
                endAt: null,
            });
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'plain-secret'
            );
        });

        it('prepares the create activity log with the drawn id before the write and stages it after', async () => {
            const body: ApiKeyCreateRequestDto = {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
            };
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyDomain.createByAdmin.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminApiKeyCreate,
                    metadata,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return { apiKey, secret: 'plain-secret' };
            });
            apiKeyUtil.mapCreate.mockReturnValue({
                ...apiKey,
                secret: 'plain-secret',
            });

            await service.createByAdmin(body);

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: apiKey.id,
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                },
                now
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: ApiKeyCreateRequestDto = {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
            };
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyDomain.createByAdmin.mockRejectedValue(new Error('boom'));

            await expect(service.createByAdmin(body)).rejects.toThrow('boom');
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateStatusByAdmin', () => {
        it('updates the status and wraps the result', async () => {
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyDomain.updateStatusByAdmin.mockResolvedValue(updated);

            const result = await service.updateStatusByAdmin(apiKey.id, {
                isActive: false,
            });

            expect(result).toEqual({ data: updated });
            expect(apiKeyDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                apiKey.id,
                false
            );
        });

        it('prepares the status activity log from the updated key and stages it after the write', async () => {
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyDomain.updateStatusByAdmin.mockResolvedValue(updated);

            await service.updateStatusByAdmin(apiKey.id, { isActive: false });

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                updated,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdateStatus,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('updateByAdmin', () => {
        it('renames the api key and wraps the result', async () => {
            const updated: ApiKey = { ...apiKey, name: 'New Name' };
            apiKeyDomain.updateByAdmin.mockResolvedValue(updated);

            const result = await service.updateByAdmin(apiKey.id, {
                name: 'New Name',
            });

            expect(result).toEqual({ data: updated });
            expect(apiKeyDomain.updateByAdmin).toHaveBeenCalledWith(
                apiKey.id,
                'New Name'
            );
        });

        it('prepares the update activity log from the renamed key and stages it after the write', async () => {
            const updated: ApiKey = { ...apiKey, name: 'New Name' };
            apiKeyDomain.updateByAdmin.mockResolvedValue(updated);

            await service.updateByAdmin(apiKey.id, { name: 'New Name' });

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                updated,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdate,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('updateDatesByAdmin', () => {
        it('updates the date window and wraps the result', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const body: ApiKeyUpdateDateRequestDto = { startAt, endAt };
            const updated: ApiKey = { ...apiKey, startAt, endAt };
            apiKeyDomain.updateDatesByAdmin.mockResolvedValue(updated);

            const result = await service.updateDatesByAdmin(apiKey.id, body);

            expect(result).toEqual({ data: updated });
            expect(apiKeyDomain.updateDatesByAdmin).toHaveBeenCalledWith(
                apiKey.id,
                startAt,
                endAt
            );
        });

        it('prepares the date activity log from the updated key and stages it after the write', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const updated: ApiKey = { ...apiKey, startAt, endAt };
            apiKeyDomain.updateDatesByAdmin.mockResolvedValue(updated);

            await service.updateDatesByAdmin(apiKey.id, { startAt, endAt });

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                updated,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdateDate,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('resetByAdmin', () => {
        it('resets the secret and shapes the secret-bearing response', async () => {
            apiKeyDomain.resetByAdmin.mockResolvedValue({
                apiKey,
                secret: 'new-secret',
            });
            const reset = { ...apiKey, secret: 'new-secret' };
            apiKeyUtil.mapCreate.mockReturnValue(reset);

            const result = await service.resetByAdmin(apiKey.id);

            expect(result).toEqual({ data: reset });
            expect(apiKeyDomain.resetByAdmin).toHaveBeenCalledWith(apiKey.id);
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'new-secret'
            );
        });

        it('prepares the reset activity log from the reset key and stages it after the write', async () => {
            apiKeyDomain.resetByAdmin.mockResolvedValue({
                apiKey,
                secret: 'new-secret',
            });
            apiKeyUtil.mapCreate.mockReturnValue({
                ...apiKey,
                secret: 'new-secret',
            });

            await service.resetByAdmin(apiKey.id);

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyReset,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('deleteByAdmin', () => {
        it('deletes the api key and wraps the result', async () => {
            apiKeyDomain.deleteByAdmin.mockResolvedValue(apiKey);

            const result = await service.deleteByAdmin(apiKey.id);

            expect(result).toEqual({ data: apiKey });
            expect(apiKeyDomain.deleteByAdmin).toHaveBeenCalledWith(apiKey.id);
        });

        it('prepares the delete activity log from the deleted key and stages it after the write', async () => {
            apiKeyDomain.deleteByAdmin.mockResolvedValue(apiKey);

            await service.deleteByAdmin(apiKey.id);

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyDelete,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
