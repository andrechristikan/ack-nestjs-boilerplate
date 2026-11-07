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
    TermPolicyDefaultType,
    TermPolicyPublicListCursorScope,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyGetListPublishedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-published.use-case';
import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';

describe('TermPolicyGetListPublishedUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as TermPolicy[],
    };
    const cursorParams = {
        limit: 20,
        orderBy: [],
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };

    let useCase: TermPolicyGetListPublishedUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListPublishedUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListPublishedUseCase);
    });

    describe('execute', () => {
        const query: TermPolicyPublicListRequestDto = { perPage: 20 };

        it('merges the type filter into the pagination store and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            paginationFilterUtil.inEnum.mockReturnValue({
                where: { type: { in: TermPolicyDefaultType } },
                storeFilter: { type: 'privacy' },
            });
            termPolicyService.getListPublished.mockResolvedValue(cursorPage);

            const result = await useCase.execute(query);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: TermPolicyPublicListCursorScope,
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                Prisma.TermPolicyScalarFieldEnum.type,
                query.type,
                TermPolicyDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true, type: 'privacy' } }
            );
            expect(termPolicyService.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                { type: { in: TermPolicyDefaultType } }
            );
        });

        it('merges no extra filter when type resolves to undefined', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            paginationFilterUtil.inEnum.mockReturnValue(null);
            termPolicyService.getListPublished.mockResolvedValue(cursorPage);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(termPolicyService.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                undefined
            );
        });
    });
});
