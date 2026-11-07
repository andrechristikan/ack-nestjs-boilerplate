import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    SessionCursorAvailableOrderBy,
    SessionSharedListCursorScope,
} from '@modules/session/constants/session.list.constant';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionGetListCursorUseCase } from '@modules/session/use-cases/session.get-list-cursor.use-case';

describe('SessionGetListCursorUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let useCase: SessionGetListCursorUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionGetListCursorUseCase,
                { provide: SessionService, useValue: sessionService },
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
        useCase = module.get(SessionGetListCursorUseCase);
    });

    describe('execute', () => {
        it('delegates to the domain with the cursor pagination params', async () => {
            const query: SessionSharedListRequestDto = {};
            const params = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const storePatch = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            sessionService.getListCursor.mockResolvedValue(paginationResult);

            const result = await useCase.execute('user-1', query);

            expect(result).toEqual({
                data: [],
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: SessionSharedListCursorScope,
                availableOrderBy: SessionCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(sessionService.getListCursor).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });
});
