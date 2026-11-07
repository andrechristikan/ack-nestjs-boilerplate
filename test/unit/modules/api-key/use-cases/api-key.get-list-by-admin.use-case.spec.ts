import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';
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
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyGetListByAdminUseCase } from '@modules/api-key/use-cases/api-key.get-list-by-admin.use-case';

describe('ApiKeyGetListByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
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

    let useCase: ApiKeyGetListByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyGetListByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
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
            ],
        }).compile();

        useCase = module.get(ApiKeyGetListByAdminUseCase);
    });

    describe('execute', () => {
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
            apiKeyService.getListByAdmin.mockResolvedValue(page);

            const result = await useCase.execute(query);

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
            expect(apiKeyService.getListByAdmin).toHaveBeenCalledWith(
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
            apiKeyService.getListByAdmin.mockResolvedValue(emptyPage);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(apiKeyService.getListByAdmin).toHaveBeenCalledWith(
                pagination,
                undefined,
                undefined
            );
        });
    });
});
