import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { IPaginationOffsetReturn } from '@common/pagination/interfaces/pagination.interface';
import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyGetListByAdminUseCase } from '@modules/api-key/use-cases/api-key.get-list-by-admin.use-case';
import { buildApiKey } from '@test/unit/helpers/test.unit.request.helper';

describe('ApiKeyGetListByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const apiKey: ApiKey = buildApiKey();
    const pagination = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };

    let useCase: ApiKeyGetListByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyGetListByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
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
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    perPage: 20,
                    orderBy: 'latest',
                    availableSearch: ['name'],
                    availableOrderBy: ['latest', 'name'],
                    filters: {
                        isActive: true,
                        type: [EnumApiKeyType.default],
                    },
                }
            );
            expect(apiKeyService.getListByAdmin).toHaveBeenCalledWith(
                pagination,
                { isActive: { equals: true } },
                { type: { in: [EnumApiKeyType.default] } }
            );
        });

        it('merges an empty filter set when isActive and type are both absent', async () => {
            const query: ApiKeyListRequestDto = {};
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
                {
                    page: 1,
                    perPage: 20,
                    orderBy: 'latest',
                    availableSearch: ['name'],
                    availableOrderBy: ['latest', 'name'],
                    filters: {},
                }
            );
            expect(apiKeyService.getListByAdmin).toHaveBeenCalledWith(
                pagination,
                undefined,
                undefined
            );
        });
    });
});
