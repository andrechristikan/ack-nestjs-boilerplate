import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import {
    SessionCursorAvailableOrderBy,
    SessionSharedListCursorScope,
} from '@modules/session/constants/session.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionGetListCursorUseCase implements IAppUseCase<
    [string, SessionSharedListRequestDto],
    IResponsePaginationReturn<ISessionList>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: SessionSharedListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.SessionWhereInput>(query, {
                scope: SessionSharedListCursorScope,
                availableOrderBy: SessionCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.sessionService.getListCursor(
            userId,
            params
        );
        return {
            data,
            ...others,
        };
    }
}
