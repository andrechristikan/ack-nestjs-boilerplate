import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyGetListByAdminUseCase implements IAppUseCase<
    [TermPolicyAdminListRequestDto],
    IResponsePaginationReturn<TermPolicy>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: TermPolicyAdminListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.TermPolicyWhereInput>(
                query,
                { availableOrderBy: TermPolicyDefaultAvailableOrderBy }
            );
        const type = this.paginationFilterUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.type,
            query.type,
            TermPolicyDefaultType
        );
        const status = this.paginationFilterUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.status,
            query.status,
            TermPolicyDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.termPolicyService.getListByAdmin(
            params,
            type?.where,
            status?.where
        );
        return {
            data,
            ...others,
        };
    }
}
