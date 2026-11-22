import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyGetListByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-by-admin.use-case';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';

describe('TermPolicyGetListByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [] as TermPolicy[],
    };
    const offsetParams = { skip: 0, limit: 20, orderBy: [] };

    let useCase: TermPolicyGetListByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListByAdminUseCase);
    });

    describe('execute', () => {
        const query: TermPolicyAdminListRequestDto = { page: 1, perPage: 20 };

        it('merges type and status filters into the pagination store and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: { filters: { existing: true } },
            });
            paginationFilterUtil.inEnum
                .mockReturnValueOnce({
                    where: { type: { in: TermPolicyDefaultType } },
                    storeFilter: { type: 'privacy' },
                })
                .mockReturnValueOnce({
                    where: { status: { in: TermPolicyDefaultStatus } },
                    storeFilter: { status: 'draft' },
                });
            termPolicyService.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await useCase.execute(query);

            expect(result).toEqual(offsetPage);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.inEnum).toHaveBeenNthCalledWith(
                1,
                Prisma.TermPolicyScalarFieldEnum.type,
                query.type,
                TermPolicyDefaultType
            );
            expect(paginationFilterUtil.inEnum).toHaveBeenNthCalledWith(
                2,
                Prisma.TermPolicyScalarFieldEnum.status,
                query.status,
                TermPolicyDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        existing: true,
                        type: 'privacy',
                        status: 'draft',
                    },
                }
            );
            expect(termPolicyService.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                { type: { in: TermPolicyDefaultType } },
                { status: { in: TermPolicyDefaultStatus } }
            );
        });

        it('merges no extra filter when type and status resolve to undefined', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: {},
            });
            paginationFilterUtil.inEnum.mockReturnValue(null);
            termPolicyService.getListByAdmin.mockResolvedValue(offsetPage);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(termPolicyService.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined
            );
        });
    });
});
