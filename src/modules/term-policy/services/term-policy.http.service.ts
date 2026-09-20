import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyHttpService {
    constructor(private readonly termPolicyDomain: TermPolicyDomain) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        const { data, ...others } = await this.termPolicyDomain.getListByAdmin(
            pagination,
            type,
            status
        );
        return {
            data,
            ...others,
        };
    }

    async getListPublished(
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        const { data, ...others } =
            await this.termPolicyDomain.getListPublished(pagination, type);
        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: TermPolicyCreateRequestDto
    ): Promise<IResponseReturn<ITermPolicy>> {
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
