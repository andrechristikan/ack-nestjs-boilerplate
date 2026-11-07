import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyGetListUserAcceptedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-accepted.use-case';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import {
    TermPolicyAcceptanceDefaultAvailableOrderBy,
    TermPolicyAcceptanceSharedListCursorScope,
} from '@modules/term-policy/constants/term-policy.list.constant';

describe('TermPolicyGetListUserAcceptedUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const cursorParams = {
        limit: 20,
        orderBy: [],
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as ITermPolicyUserAcceptance[],
    };

    let useCase: TermPolicyGetListUserAcceptedUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorParams,
            storePatch: { filters: {} },
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListUserAcceptedUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListUserAcceptedUseCase);
    });

    describe('execute', () => {
        it('merges the pagination store patch and returns the domain page', async () => {
            const query: TermPolicyAcceptedListRequestDto = { perPage: 20 };
            termPolicyAcceptanceService.getListUserAccepted.mockResolvedValue(
                cursorPage
            );

            const result = await useCase.execute('user-1', query);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: TermPolicyAcceptanceSharedListCursorScope,
                availableOrderBy: TermPolicyAcceptanceDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(
                termPolicyAcceptanceService.getListUserAccepted
            ).toHaveBeenCalledWith('user-1', cursorParams);
        });
    });
});
