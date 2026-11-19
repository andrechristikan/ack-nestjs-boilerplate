import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Injectable } from '@nestjs/common';
import { PasswordHistoryOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumPasswordHistoryOrderBy } from '@modules/password-history/enums/password-history.enum';

@Injectable()
export class PasswordHistoryGetListOffsetByAdminUseCase implements IAppUseCase<
    [string, PasswordHistoryAdminListRequestDto],
    IResponsePaginationReturn<IPasswordHistoryList>
> {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: PasswordHistoryAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: PasswordHistoryOrderBy,
            defaultOrderBy: EnumPasswordHistoryOrderBy.latest,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.passwordHistoryService.getListOffsetByAdmin(
                userId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
