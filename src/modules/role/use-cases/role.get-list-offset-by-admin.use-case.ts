import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultType,
} from '@modules/role/constants/role.list.constant';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleGetListOffsetByAdminUseCase implements IAppUseCase<
    [RoleAdminListRequestDto],
    IResponsePaginationReturn<RoleListResponseDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: RoleAdminListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.RoleWhereInput>(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
        const type = this.paginationFilterUtil.inEnum(
            Prisma.RoleScalarFieldEnum.type,
            query.type,
            RoleDefaultType
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.roleService.getListOffsetByAdmin(
            params,
            type?.where
        );
        const roles: RoleListResponseDto[] = data.map(
            ({ _count, ...role }) => ({
                ...role,
                policies: _count.policies,
            })
        );

        return {
            data: roles,
            ...others,
        };
    }
}
