import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import type {
    IApiKeyCreated,
    IApiKeyList,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
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
    const apiKey = {
        id: 'api-key-id',
        type: EnumApiKeyType.default,
        name: 'API Key',
        key: 'key',
        hash: 'hash',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies ApiKey;
    const apiKeyListItem = {
        id: 'api-key-id',
        type: EnumApiKeyType.default,
        name: 'API Key',
        key: 'key',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies IApiKeyList;
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [apiKeyListItem],
    };
    const offsetParams = {
        where: undefined,
        limit: 20,
        skip: 0,
        orderBy: [],
    };
    const offsetStorePatch = {
        page: 1,
        perPage: 20,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
    };
    const createdWithSecret = {
        ...apiKey,
        secret: 'plain-secret',
    } satisfies IApiKeyCreated;

    let service: ApiKeyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

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
        it('merges isActive and type filters when provided', async () => {
            const query = {
                isActive: true,
                type: EnumApiKeyType.default,
            } satisfies ApiKeyListRequestDto;
            const isActiveWhere = { isActive: true };
            const typeWhere = { type: { in: [EnumApiKeyType.default] } };
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: isActiveWhere,
                storeFilter: { isActive: true },
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue({
                where: typeWhere,
                storeFilter: { type: [EnumApiKeyType.default] },
            } as never);
            apiKeyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: {
                        isActive: true,
                        type: [EnumApiKeyType.default],
                    },
                }
            );
            expect(apiKeyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                isActiveWhere,
                typeWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('merges an empty filter set when no filters are provided', async () => {
            const query = {} satisfies ApiKeyListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            apiKeyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            await service.getListByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: {},
                }
            );
            expect(apiKeyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined
            );
        });
    });

    describe('createByAdmin', () => {
        it('creates through the domain and maps the raw secret onto the response', async () => {
            const request = {
                name: 'API Key',
                type: EnumApiKeyType.default,
            } satisfies ApiKeyCreateRequestDto;
            apiKeyDomain.createByAdmin.mockResolvedValue({
                apiKey,
                secret: 'plain-secret',
            });
            apiKeyUtil.mapCreate.mockReturnValue(createdWithSecret);

            const result = await service.createByAdmin(request);

            expect(apiKeyDomain.createByAdmin).toHaveBeenCalledWith(request);
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'plain-secret'
            );
            expect(result).toEqual({ data: createdWithSecret });
            expect(result.data?.secret).toBe('plain-secret');
        });
    });

    describe('updateStatusByAdmin', () => {
        it('delegates to the domain and wraps the updated key', async () => {
            const request = {
                isActive: false,
            } satisfies ApiKeyUpdateStatusRequestDto;
            const updated = { ...apiKey, isActive: false } satisfies ApiKey;
            apiKeyDomain.updateStatusByAdmin.mockResolvedValue(updated);

            const result = await service.updateStatusByAdmin(
                'api-key-id',
                request
            );

            expect(apiKeyDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                'api-key-id',
                false
            );
            expect(result).toEqual({ data: updated });
        });
    });

    describe('updateByAdmin', () => {
        it('delegates to the domain and wraps the updated key', async () => {
            const request = {
                name: 'Renamed key',
            } satisfies ApiKeyUpdateRequestDto;
            const updated = {
                ...apiKey,
                name: 'Renamed key',
            } satisfies ApiKey;
            apiKeyDomain.updateByAdmin.mockResolvedValue(updated);

            const result = await service.updateByAdmin('api-key-id', request);

            expect(apiKeyDomain.updateByAdmin).toHaveBeenCalledWith(
                'api-key-id',
                'Renamed key'
            );
            expect(result).toEqual({ data: updated });
        });
    });

    describe('updateDatesByAdmin', () => {
        it('delegates to the domain and wraps the updated key', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const request = {
                startAt,
                endAt,
            } satisfies ApiKeyUpdateDateRequestDto;
            const updated = { ...apiKey, startAt, endAt } satisfies ApiKey;
            apiKeyDomain.updateDatesByAdmin.mockResolvedValue(updated);

            const result = await service.updateDatesByAdmin(
                'api-key-id',
                request
            );

            expect(apiKeyDomain.updateDatesByAdmin).toHaveBeenCalledWith(
                'api-key-id',
                startAt,
                endAt
            );
            expect(result).toEqual({ data: updated });
        });
    });

    describe('resetByAdmin', () => {
        it('resets through the domain and maps the raw secret onto the response', async () => {
            apiKeyDomain.resetByAdmin.mockResolvedValue({
                apiKey,
                secret: 'reset-secret',
            });
            const resetWithSecret = {
                ...apiKey,
                secret: 'reset-secret',
            } satisfies IApiKeyCreated;
            apiKeyUtil.mapCreate.mockReturnValue(resetWithSecret);

            const result = await service.resetByAdmin('api-key-id');

            expect(apiKeyDomain.resetByAdmin).toHaveBeenCalledWith(
                'api-key-id'
            );
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'reset-secret'
            );
            expect(result).toEqual({ data: resetWithSecret });
            expect(result.data?.secret).toBe('reset-secret');
        });
    });

    describe('deleteByAdmin', () => {
        it('delegates to the domain and wraps the deleted key', async () => {
            apiKeyDomain.deleteByAdmin.mockResolvedValue(apiKey);

            const result = await service.deleteByAdmin('api-key-id');

            expect(apiKeyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'api-key-id'
            );
            expect(result).toEqual({ data: apiKey });
        });
    });
});
