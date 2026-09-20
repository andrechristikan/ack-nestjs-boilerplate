import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type { IApiKeyList } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyHttpService {
    constructor(
        private readonly apiKeyDomain: ApiKeyDomain,
        private readonly apiKeyUtil: ApiKeyUtil
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IApiKeyList>> {
        const { data, ...others } = await this.apiKeyDomain.getListByAdmin(
            pagination,
            isActive,
            type
        );

        return {
            data,
            ...others,
        };
    }

    async createByAdmin(
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const { apiKey, secret } = await this.apiKeyDomain.createByAdmin(body);
        const created = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: created };
    }

    async updateStatusByAdmin(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKey>> {
        const updated = await this.apiKeyDomain.updateStatusByAdmin(
            id,
            isActive
        );

        return {
            data: updated,
        };
    }

    async updateByAdmin(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<ApiKey>> {
        const updated = await this.apiKeyDomain.updateByAdmin(id, name);

        return {
            data: updated,
        };
    }

    async updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKey>> {
        const updated = await this.apiKeyDomain.updateDatesByAdmin(
            id,
            startAt,
            endAt
        );

        return {
            data: updated,
        };
    }

    async resetByAdmin(
        id: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const { apiKey, secret } = await this.apiKeyDomain.resetByAdmin(id);
        const reset = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: reset };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<ApiKey>> {
        const deleted = await this.apiKeyDomain.deleteByAdmin(id);

        return {
            data: deleted,
        };
    }
}
