import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyAdminListSelect } from '@modules/api-key/constants/api-key.constant';
import type { IApiKeyList } from '@modules/api-key/interfaces/api-key.interface';
import type { IApiKeyRepository } from '@modules/api-key/interfaces/api-key.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

@Injectable()
export class ApiKeyRepository implements IApiKeyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPagination(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IApiKeyList>> {
        return this.paginationService.offset<
            IApiKeyList,
            Prisma.ApiKeyWhereInput
        >(this.databaseService.client.apiKey, {
            ...params,
            where: {
                ...where,
                ...isActive,
                ...type,
            },
            select: ApiKeyAdminListSelect,
        });
    }

    async create(
        apiKeyId: string,
        { name, type, startAt, endAt }: ApiKeyCreateRequestDto,
        key: string,
        hash: string
    ): Promise<ApiKey> {
        return this.databaseService.client.apiKey.create({
            data: {
                id: apiKeyId,
                name,
                key,
                hash,
                isActive: true,
                type,
                startAt,
                endAt,
            },
        });
    }

    async findOneById(id: string): Promise<ApiKey | null> {
        return this.databaseService.client.apiKey.findUnique({
            where: {
                id,
            },
        });
    }

    async updateStatus(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<ApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                isActive,
            },
        });
    }

    async updateName(id: string, name: string): Promise<ApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                name,
            },
        });
    }

    async updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                startAt,
                endAt,
            },
        });
    }

    async updateHash(id: string, hash: string): Promise<ApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                hash,
            },
        });
    }

    async delete(id: string): Promise<ApiKey> {
        return this.databaseService.client.apiKey.delete({
            where: {
                id,
            },
        });
    }

    async findOneByKey(key: string): Promise<ApiKey | null> {
        return this.databaseService.client.apiKey.findUnique({
            where: {
                key,
            },
        });
    }
}
