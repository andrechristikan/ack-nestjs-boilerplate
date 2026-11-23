import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultScope,
    RoleSystemListCursorScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class RoleGetListCursorBySystemUseCase implements IAppUseCase<
    [RoleSystemListRequestDto],
    IResponsePaginationReturn<RoleListResponseDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: RoleSystemListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: RoleSystemListCursorScope,
            availableSearch: RoleDefaultAvailableSearch,
            availableOrderBy: RoleDefaultAvailableOrderBy,
        });
        const scopeFilter = this.paginationFilterUtil.inEnum(
            Prisma.RoleScalarFieldEnum.scope,
            query.scope,
            RoleDefaultScope
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(scopeFilter?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.roleService.getListCursorBySystem(
                params,
                scopeFilter?.where ?? null
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
