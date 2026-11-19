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
    SessionCursorOrderBy,
    SessionSharedListCursorScope,
} from '@modules/session/constants/session.list.constant';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionGetListCursorUseCase } from '@modules/session/use-cases/session.get-list-cursor.use-case';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumSessionCursorOrderBy } from '@modules/session/enums/session.enum';

describe('SessionGetListCursorUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const userContext = buildUserContext(
        buildUser('user-1', 'user@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
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

            const result = await useCase.execute(authContext, query);

            expect(result).toEqual({
                data: [],
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: SessionSharedListCursorScope,
                orderBy: SessionCursorOrderBy,
                defaultOrderBy: EnumSessionCursorOrderBy.latest,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(sessionService.getListCursor).toHaveBeenCalledWith(
                authContext.userId,
                params
            );
        });
    });
});
