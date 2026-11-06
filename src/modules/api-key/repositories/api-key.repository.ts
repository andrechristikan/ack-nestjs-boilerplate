import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
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
        return this.paginationService.offset(
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
        expectedIsActive: boolean,
        isActive: boolean
    ): Promise<IApiKey | null> {
        const { count } = await this.databaseService.client.apiKey.updateMany({
            where: {
                id,
                isActive: expectedIsActive,
            },
            data: {
                isActive,
            },
        });
        if (count === 0) {
            return null;
        }

        return this.findOneById(id);
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
        startAt: Date,
        endAt: Date
    ): Promise<IApiKey | null> {
        const { count } = await this.databaseService.client.apiKey.updateMany({
            where: {
                id,
                isActive: true,
            },
            data: {
                startAt,
                endAt,
            },
        });
        if (count === 0) {
            return null;
        }

        return this.findOneById(id);
    }

    async updateHash(id: string, hash: string): Promise<IApiKey | null> {
        const { count } = await this.databaseService.client.apiKey.updateMany({
            where: {
                id,
                isActive: true,
            },
            data: {
                hash,
            },
        });
        if (count === 0) {
            return null;
        }

        return this.findOneById(id);
    }

    async delete(id: string): Promise<boolean> {
        const { count } = await this.databaseService.client.apiKey.deleteMany({
            where: {
                id,
            },
        });

        return count > 0;
    }

    async findOneByKey(key: string): Promise<ApiKey | null> {
        return this.databaseService.client.apiKey.findUnique({
            where: {
                key,
            },
        });
    }
}
