import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';
import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyHttpService {
    constructor(
        private readonly termPolicyDomain: TermPolicyDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListByAdmin(
        query: TermPolicyAdminListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.TermPolicyWhereInput>(
                query,
                {
                    availableOrderBy: TermPolicyDefaultAvailableOrderBy,
                }
            );
        const type = this.paginationQueryUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.type,
            query.type,
            TermPolicyDefaultType
        );
        const status = this.paginationQueryUtil.inEnum(
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

        const { data, ...others } = await this.termPolicyDomain.getListByAdmin(
            params,
            type?.where,
            status?.where
        );
        return {
            data,
            ...others,
        };
    }

    async getListPublished(
        query: TermPolicyPublicListRequestDto
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.TermPolicyWhereInput>(
                query,
                {
                    availableOrderBy: TermPolicyDefaultAvailableOrderBy,
                }
            );
        const type = this.paginationQueryUtil.inEnum(
            Prisma.TermPolicyScalarFieldEnum.type,
            query.type,
            TermPolicyDefaultType
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.termPolicyDomain.getListPublished(params, type?.where);
        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: TermPolicyCreateRequestDto
    ): Promise<IResponseReturn<TermPolicy>> {
        const created = await this.termPolicyDomain.createByAdmin(body);

        return { data: created };
    }

    async deleteByAdmin(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicy>> {
        const deleted = await this.termPolicyDomain.deleteByAdmin(termPolicyId);

        return { data: deleted };
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyDomain.publishByAdmin(termPolicyId, updatedBy);

        return {};
    }
}
