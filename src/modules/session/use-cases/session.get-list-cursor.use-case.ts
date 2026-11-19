import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import {
    SessionCursorOrderBy,
    SessionSharedListCursorScope,
} from '@modules/session/constants/session.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import { EnumSessionCursorOrderBy } from '@modules/session/enums/session.enum';

@Injectable()
export class SessionGetListCursorUseCase implements IAppUseCase<
    [IAuthJwtAccessContext, SessionSharedListRequestDto],
    IResponsePaginationReturn<ISessionList>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        authContext: IAuthJwtAccessContext,
        query: SessionSharedListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: SessionSharedListCursorScope,
            orderBy: SessionCursorOrderBy,
            defaultOrderBy: EnumSessionCursorOrderBy.latest,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.sessionService.getListCursor(
            authContext.userId,
            params
        );
        return {
            data,
            ...others,
        };
    }
}
