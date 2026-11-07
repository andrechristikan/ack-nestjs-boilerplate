import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { PasswordHistorySharedListRequestDto } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Injectable } from '@nestjs/common';
import {
    PasswordHistoryCursorAvailableOrderBy,
    PasswordHistorySharedListCursorScope,
} from '@modules/password-history/constants/password-history.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PasswordHistoryGetListCursorUseCase implements IAppUseCase<
    [string, PasswordHistorySharedListRequestDto],
    IResponsePaginationReturn<IPasswordHistoryList>
> {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: PasswordHistorySharedListRequestDto
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.PasswordHistoryWhereInput>(
                query,
                {
                    scope: PasswordHistorySharedListCursorScope,
                    availableOrderBy: PasswordHistoryCursorAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.passwordHistoryService.getListCursor(userId, params);

        return {
            data,
            ...others,
        };
    }
}
