import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeySelect } from '@modules/api-key/constants/api-key.constant';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';
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
        isActive: Record<string, IPaginationEqual> | null,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        return this.paginationService.offset<IApiKey, Prisma.ApiKeyWhereInput>(
            this.databaseService.client.apiKey,
            {
                ...params,
                where: {
                    ...where,
                    ...isActive,
                    ...type,
                },
                select: ApiKeySelect,
            }
        );
    }

    async create(
        apiKeyId: string,
        { name, type, startAt, endAt }: IApiKeyCreate,
        key: string,
        hash: string
    ): Promise<IApiKey> {
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
            select: ApiKeySelect,
        });
    }

    async findOneById(id: string): Promise<IApiKey | null> {
        return this.databaseService.client.apiKey.findUnique({
            where: {
                id,
            },
            select: ApiKeySelect,
        });
    }

    async updateStatus(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<IApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                isActive,
            },
            select: ApiKeySelect,
        });
    }

    async updateName(id: string, name: string): Promise<IApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                name,
            },
            select: ApiKeySelect,
        });
    }

    async updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                startAt,
                endAt,
            },
            select: ApiKeySelect,
        });
    }

    async updateHash(id: string, hash: string): Promise<IApiKey> {
        return this.databaseService.client.apiKey.update({
            where: {
                id,
            },
            data: {
                hash,
            },
            select: ApiKeySelect,
        });
    }

    async delete(id: string): Promise<IApiKey> {
        return this.databaseService.client.apiKey.delete({
            where: {
                id,
            },
            select: ApiKeySelect,
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
