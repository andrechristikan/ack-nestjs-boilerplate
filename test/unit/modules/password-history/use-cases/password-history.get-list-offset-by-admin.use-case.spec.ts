import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Prisma } from '@generated/prisma-client/client';
import { PasswordHistoryDefaultAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import { PasswordHistoryGetListOffsetByAdminUseCase } from '@modules/password-history/use-cases/password-history.get-list-offset-by-admin.use-case';

describe('PasswordHistoryGetListOffsetByAdminUseCase', () => {
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const offsetParams: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
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
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryGetListOffsetByAdminUseCase,
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
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
        useCase = module.get(PasswordHistoryGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        const query: PasswordHistoryAdminListRequestDto = {
            page: 1,
            perPage: 20,
        };

        it('merges the pagination store patch and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: { filters: { existing: true } },
            });
            passwordHistoryService.getListOffsetByAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await useCase.execute('user-id', query);

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: PasswordHistoryDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true } }
            );
            expect(
                passwordHistoryService.getListOffsetByAdmin
            ).toHaveBeenCalledWith('user-id', offsetParams);
            expect(result).toEqual(offsetPage);
        });
    });
});
