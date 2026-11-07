import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class SessionGetListOffsetByAdminUseCase implements IAppUseCase<
    [string, SessionAdminListRequestDto],
    IResponsePaginationReturn<ISessionList>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: SessionAdminListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.SessionWhereInput>(query, {
                availableOrderBy: SessionDefaultAvailableOrderBy,
            });
        const isRevoked = this.paginationFilterUtil.equalBoolean(
            Prisma.SessionScalarFieldEnum.isRevoked,
            query.isRevoked
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isRevoked?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.sessionService.getListOffsetByAdmin(
                userId,
                params,
                isRevoked?.where
            );
        return {
            data,
            ...others,
        };
    }
}
