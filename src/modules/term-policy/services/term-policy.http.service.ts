import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { Injectable } from '@nestjs/common';
import { Prisma, TermPolicy } from '@generated/prisma-client';

@Injectable()
export class TermPolicyHttpService {
    constructor(private readonly termPolicyDomain: TermPolicyDomain) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>> {
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
    ): Promise<IResponsePagingReturn<TermPolicy>> {
        const { data, ...others } =
            await this.termPolicyDomain.getListPublished(pagination, type);
        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: TermPolicyCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<TermPolicy>> {
        const created = await this.termPolicyDomain.createByAdmin(
            body,
            createdBy
        );

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
