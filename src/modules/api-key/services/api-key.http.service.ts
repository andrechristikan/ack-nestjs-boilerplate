import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKey, Prisma } from '@generated/prisma-client';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { IApiKeyHttpService } from '@modules/api-key/interfaces/api-key.http.service.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyHttpService implements IApiKeyHttpService {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKey>> {
        const { data, ...others } = await this.apiKeyService.getListByAdmin(
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
        const { apiKey, secret } = await this.apiKeyService.createByAdmin(body);

        return {
            data: this.apiKeyUtil.mapCreate(apiKey, secret),
        };
    }

    async updateStatusByAdmin(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKey>> {
        const updated = await this.apiKeyService.updateStatusByAdmin(
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
        const updated = await this.apiKeyService.updateByAdmin(id, name);

        return {
            data: updated,
        };
    }

    async updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKey>> {
        const updated = await this.apiKeyService.updateDatesByAdmin(
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
        const { apiKey, secret } = await this.apiKeyService.resetByAdmin(id);

        return {
            data: this.apiKeyUtil.mapCreate(apiKey, secret),
        };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<ApiKey>> {
        const deleted = await this.apiKeyService.deleteByAdmin(id);

        return {
            data: deleted,
        };
    }
}
