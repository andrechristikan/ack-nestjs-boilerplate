import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Prisma } from '@generated/prisma-client/client';
import {
    PasswordHistoryCursorAvailableOrderBy,
    PasswordHistoryDefaultAvailableOrderBy,
} from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import type { PasswordHistorySharedListRequestDto } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';

describe('PasswordHistoryHttpService', () => {
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let service: PasswordHistoryHttpService;

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
    const cursorParams: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput> =
        { limit: 20, orderBy: [] };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryHttpService,
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
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
        service = module.get(PasswordHistoryHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        const query: PasswordHistoryAdminListRequestDto = {
            page: 1,
            perPage: 20,
        };

        it('merges the pagination store patch and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: { filters: { existing: true } },
            });
            passwordHistoryDomain.getListOffsetByAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await service.getListOffsetByAdmin('user-id', query);

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: PasswordHistoryDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true } }
            );
            expect(
                passwordHistoryDomain.getListOffsetByAdmin
            ).toHaveBeenCalledWith('user-id', offsetParams);
            expect(result).toEqual(offsetPage);
        });
    });

    describe('getListCursor', () => {
        const query: PasswordHistorySharedListRequestDto = { perPage: 20 };

        it('merges the pagination store patch and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            passwordHistoryDomain.getListCursor.mockResolvedValue(cursorPage);

            const result = await service.getListCursor('user-id', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: PasswordHistoryCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true } }
            );
            expect(passwordHistoryDomain.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });
    });
});
