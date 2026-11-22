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

    private async updateScoped(
        id: string,
        data: Prisma.ApiKeyUpdateManyMutationInput
    ): Promise<ApiKey | null> {
        return this.databaseService.withTransaction(async tx => {
            const { count } = await tx.apiKey.updateMany({
                where: { id },
                data,
            });
            if (count === 0) {
                return null;
            }

            return tx.apiKey.findUnique({
                where: { id },
            });
        });
    }

    /** Extra caller-supplied constraint, AND-composed first. */
    async findWithPagination(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive: Record<string, IPaginationEqual> | undefined,
        type: Record<string, IPaginationIn> | undefined,
        additionalWhere: Prisma.ApiKeyWhereInput
    ): Promise<IResponsePaginationReturn<IApiKeyList>> {
        return this.paginationService.offset<
            IApiKeyList,
            Prisma.ApiKeyWhereInput
        >(this.databaseService.client.apiKey, {
            ...params,
            where: {
                AND: [
                    additionalWhere,
                    {
                        ...where,
                        ...isActive,
                        ...type,
                    },
                ],
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
        return this.databaseService.client.apiKey.findFirst({
            where: { id },
        });
    }

    async updateStatus(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<ApiKey | null> {
        return this.updateScoped(id, { isActive });
    }

    async updateName(id: string, name: string): Promise<ApiKey | null> {
        return this.updateScoped(id, { name });
    }

    async updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKey | null> {
        return this.updateScoped(id, { startAt, endAt });
    }

    async updateHash(id: string, hash: string): Promise<ApiKey | null> {
        return this.updateScoped(id, { hash });
    }

    async delete(id: string): Promise<ApiKey | null> {
        return this.databaseService.withTransaction(async tx => {
            const where: Prisma.ApiKeyWhereInput = { id };
            const existing = await tx.apiKey.findFirst({ where });
            if (!existing) {
                return null;
            }

            const { count } = await tx.apiKey.deleteMany({ where });

            return count > 0 ? existing : null;
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
