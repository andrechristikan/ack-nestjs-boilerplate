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
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { FeatureFlagSystemListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagGetListCursorUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-cursor.use-case';

describe('FeatureFlagGetListCursorUseCase', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination = {
        fingerprint: '6788295d20ae009a',
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };

    let useCase: FeatureFlagGetListCursorUseCase;

    const featureFlag: IFeatureFlag = {
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
                FeatureFlagGetListCursorUseCase,
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

        useCase = module.get(FeatureFlagGetListCursorUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: FeatureFlagSystemListRequestDto = {
                perPage: 20,
            };
            const page: IResponsePaginationReturn<IFeatureFlag> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [featureFlag],
            };
            featureFlagService.getListCursor.mockResolvedValue(page);

            const result = await useCase.execute(query);

            expect(result).toEqual(page);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: 'latest',
                    availableSearch: ['key'],
                    availableOrderBy: ['latest', 'key'],
                }
            );
            expect(featureFlagService.getListCursor).toHaveBeenCalledWith(
                pagination
            );
        });
    });
});
