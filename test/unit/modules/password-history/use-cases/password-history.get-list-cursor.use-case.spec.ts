import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    PasswordHistoryCursorOrderBy,
    PasswordHistorySharedListCursorScope,
} from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { PasswordHistorySharedListRequestDto } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import { PasswordHistoryGetListCursorUseCase } from '@modules/password-history/use-cases/password-history.get-list-cursor.use-case';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumPasswordHistoryCursorOrderBy } from '@modules/password-history/enums/password-history.enum';

describe('PasswordHistoryGetListCursorUseCase', () => {
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorParams: IPaginationQueryCursorParams = {
        fingerprint: 'aaaaaaaaaaaaaaaa',
        limit: 20,
        orderBy: [],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [],
    };
    let useCase: PasswordHistoryGetListCursorUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryGetListCursorUseCase,
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
        useCase = module.get(PasswordHistoryGetListCursorUseCase);
    });

    describe('execute', () => {
        const query: PasswordHistorySharedListRequestDto = { perPage: 20 };
        const userContext = buildUserContext(
            buildUser('user-id', 'user-id@example.com')
        );
        const authContext = buildAuthJwtAccessContext(userContext.user.id);

        it('merges the pagination store patch and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            passwordHistoryService.getListCursor.mockResolvedValue(cursorPage);

            const result = await useCase.execute(authContext, query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: PasswordHistorySharedListCursorScope,
                orderBy: PasswordHistoryCursorOrderBy,
                defaultOrderBy: EnumPasswordHistoryCursorOrderBy.latest,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true } }
            );
            expect(passwordHistoryService.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });
    });
});
