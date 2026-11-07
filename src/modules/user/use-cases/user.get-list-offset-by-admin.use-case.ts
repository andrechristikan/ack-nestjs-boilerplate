import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
    UserDefaultStatus,
} from '@modules/user/constants/user.list.constant';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { IUserList } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGetListOffsetByAdminUseCase implements IAppUseCase<
    [UserListRequestDto],
    IResponsePaginationReturn<IUserList>
> {
    constructor(
        private readonly userService: UserService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableSearch: UserDefaultAvailableSearch,
                availableOrderBy: UserDefaultAvailableOrderBy,
            });
        const status = this.paginationFilterUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationFilterUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationFilterUtil.equalString(
            Prisma.UserScalarFieldEnum.countryId,
            query.countryId
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
                ...(roleId?.storeFilter ?? {}),
                ...(countryId?.storeFilter ?? {}),
            },
        });

        return this.userService.getListOffsetByAdmin(
            params,
            status?.where,
            roleId?.where,
            countryId?.where
        );
    }
}
