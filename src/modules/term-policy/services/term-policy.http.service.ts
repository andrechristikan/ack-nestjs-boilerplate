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
import { ITermPolicyHttpService } from '@modules/term-policy/interfaces/term-policy.http.service.interface';
import { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';

@Injectable()
export class TermPolicyHttpService implements ITermPolicyHttpService {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        const { data, ...others } = await this.termPolicyService.getListByAdmin(
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
            await this.termPolicyService.getListPublished(pagination, type);
        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: TermPolicyCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<ITermPolicy>> {
        const created = await this.termPolicyService.createByAdmin(
            body,
            createdBy
        );

        return { data: created };
    }

    async deleteByAdmin(termPolicyId: string): Promise<IResponseReturn<void>> {
        await this.termPolicyService.deleteByAdmin(termPolicyId);

        return {};
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyService.publishByAdmin(termPolicyId, updatedBy);

        return {};
    }
}
