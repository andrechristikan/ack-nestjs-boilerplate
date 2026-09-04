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
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { ITermPolicyHttpService } from '@modules/term-policy/interfaces/term-policy.http.service.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';

@Injectable()
export class TermPolicyHttpService implements ITermPolicyHttpService {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyUtil: TermPolicyUtil
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        const { data, ...others } = await this.termPolicyService.getListByAdmin(
            pagination,
            type,
            status
        );
        const termPolicies: TermPolicyResponseDto[] =
            this.termPolicyUtil.mapList(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async getListPublished(
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        const { data, ...others } =
            await this.termPolicyService.getListPublished(pagination, type);
        const termPolicies: TermPolicyResponseDto[] =
            this.termPolicyUtil.mapList(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async createByAdmin(
        body: TermPolicyCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const created = await this.termPolicyService.createByAdmin(
            body,
            createdBy
        );

        return {
            data: this.termPolicyUtil.mapOne(created),
        };
    }

    async deleteByAdmin(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>> {
        const deleted =
            await this.termPolicyService.deleteByAdmin(termPolicyId);

        return {
            data: this.termPolicyUtil.mapOne(deleted),
        };
    }

    async publishByAdmin(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyService.publishByAdmin(termPolicyId, updatedBy);

        return {};
    }
}
