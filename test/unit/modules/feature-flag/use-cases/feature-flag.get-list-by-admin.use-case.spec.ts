import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { FeatureFlagAdminListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagGetListByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-by-admin.use-case';

describe('FeatureFlagGetListByAdminUseCase', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };

    let useCase: FeatureFlagGetListByAdminUseCase;

    const featureFlag: FeatureFlag = {
        id: '507f1f77bcf86cd799439011',
        key: 'loginWithGoogle',
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagGetListByAdminUseCase,
                { provide: FeatureFlagService, useValue: featureFlagService },
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

        useCase = module.get(FeatureFlagGetListByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the store patch, and returns the domain page', async () => {
            const query: FeatureFlagAdminListRequestDto = {
                page: 1,
                perPage: 20,
            };
            const page: IResponsePaginationReturn<FeatureFlag> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [featureFlag],
            };
            featureFlagService.getListByAdmin.mockResolvedValue(page);

            const result = await useCase.execute(query);

            expect(result).toEqual(page);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    perPage: 20,
                    orderBy: 'latest',
                    availableSearch: ['key'],
                    availableOrderBy: ['latest', 'key'],
                }
            );
            expect(featureFlagService.getListByAdmin).toHaveBeenCalledWith(
                pagination
            );
        });
    });
});
