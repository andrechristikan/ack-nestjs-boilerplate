import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    RoleCursorAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleSharedListCursorScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleSharedListRequestDto } from '@modules/role/dtos/request/role.shared-list.request.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Injectable } from '@nestjs/common';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class RoleGetListCursorBySharedUseCase implements IAppUseCase<
    [RoleSharedListRequestDto],
    IResponsePaginationReturn<RoleListResponseDto>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: RoleSharedListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: RoleSharedListCursorScope,
            availableSearch: RoleDefaultAvailableSearch,
            availableOrderBy: RoleCursorAvailableOrderBy,
        });
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: { ...storePatch.filters, scope: [query.scope] },
        });

        const { data, ...others } =
            await this.roleService.getListCursorByShared(params, query.scope);
        const roles: RoleListResponseDto[] = data.map(
            ({ _count, ...role }) => ({
                ...role,
                policies: _count.policies,
            })
        );

        return { data: roles, ...others };
    }
}
