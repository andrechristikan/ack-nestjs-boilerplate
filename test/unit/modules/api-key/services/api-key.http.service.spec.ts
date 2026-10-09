import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultType,
} from '@modules/api-key/constants/api-key.list.constant';
import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyHttpService } from '@modules/api-key/services/api-key.http.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

describe('ApiKeyHttpService', () => {
    const apiKeyDomain: MockProxy<ApiKeyDomain> = mock<ApiKeyDomain>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

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
    const pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput> = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let service: ApiKeyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
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
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
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
            paginationQueryUtil.equalBoolean.mockReturnValue(isActiveFilter);
            paginationQueryUtil.inEnum.mockReturnValue(typeFilter);
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
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.ApiKeyScalarFieldEnum.isActive,
                query.isActive
            );
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
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
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
            paginationQueryUtil.inEnum.mockReturnValue(null);
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

            const result = await service.createByAdmin(body);

            expect(result).toEqual({ data: created });
            expect(apiKeyDomain.createByAdmin).toHaveBeenCalledWith({
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
    });

    describe('deleteByAdmin', () => {
        it('deletes the api key and wraps the result', async () => {
            apiKeyDomain.deleteByAdmin.mockResolvedValue(apiKey);

            const result = await service.deleteByAdmin(apiKey.id);

            expect(result).toEqual({ data: apiKey });
            expect(apiKeyDomain.deleteByAdmin).toHaveBeenCalledWith(apiKey.id);
        });
    });
});
