import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import { PasswordHistoryGetListOffsetByAdminUseCase } from '@modules/password-history/use-cases/password-history.get-list-offset-by-admin.use-case';

describe('PasswordHistoryGetListOffsetByAdminUseCase', () => {
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const offsetParams: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    const storePatch = {
        page: 1,
        perPage: 20,
        orderBy: 'latest',
        availableSearch: [],
        availableOrderBy: ['latest', 'recentlyExpired'],
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 0,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [],
    };
    let useCase: PasswordHistoryGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryGetListOffsetByAdminUseCase,
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
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
        useCase = module.get(PasswordHistoryGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        const query: PasswordHistoryAdminListRequestDto = {
            page: 1,
            perPage: 20,
        };

        it('merges the pagination store patch and returns the domain page', async () => {
            passwordHistoryService.getListOffsetByAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await useCase.execute('user-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(
                passwordHistoryService.getListOffsetByAdmin
            ).toHaveBeenCalledWith('user-id', offsetParams);
            expect(result).toEqual(offsetPage);
        });
    });
});
