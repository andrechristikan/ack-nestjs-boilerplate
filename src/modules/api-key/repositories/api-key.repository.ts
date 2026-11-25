import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySelect } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';
import type { IApiKeyRepository } from '@modules/api-key/interfaces/api-key.repository.interface';
import { Injectable } from '@nestjs/common';
import type { ApiKey } from '@generated/prisma-client/client';

@Injectable()
export class ApiKeyRepository implements IApiKeyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findWithPagination(
        { where, ...params }: IPaginationQueryOffsetParams,
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

    async createInTx(
        tx: IDatabaseTransactionClient,
        apiKeyId: string,
        { name, type, startAt, endAt }: IApiKeyCreate,
        key: string,
        hash: string
    ): Promise<IApiKey> {
        return tx.apiKey.create({
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

    async updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        expectedIsActive: boolean,
        isActive: boolean
    ): Promise<IApiKey> {
        try {
            return await tx.apiKey.update({
                where: {
                    id,
                    isActive: expectedIsActive,
                },
                data: {
                    isActive,
                },
                select: ApiKeySelect,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ApiKeyNotFoundException()
            );
        }
    }

    async updateNameInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        name: string
    ): Promise<IApiKey> {
        return tx.apiKey.update({
            where: {
                id,
            },
            data: {
                name,
            },
            select: ApiKeySelect,
        });
    }

    async updateDatesInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        startAt: Date | null,
        endAt: Date | null
    ): Promise<IApiKey> {
        try {
            return await tx.apiKey.update({
                where: {
                    id,
                    isActive: true,
                },
                data: {
                    startAt,
                    endAt,
                },
                select: ApiKeySelect,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ApiKeyInactiveException()
            );
        }
    }

    async updateHashInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        hash: string
    ): Promise<IApiKey> {
        try {
            return await tx.apiKey.update({
                where: {
                    id,
                    isActive: true,
                },
                data: {
                    hash,
                },
                select: ApiKeySelect,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ApiKeyInactiveException()
            );
        }
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IApiKey> {
        try {
            return await tx.apiKey.delete({
                where: {
                    id,
                },
                select: ApiKeySelect,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ApiKeyNotFoundException()
            );
        }
    }

    async findOneByKey(key: string): Promise<ApiKey | null> {
        return this.databaseService.client.apiKey.findUnique({
            where: {
                key,
            },
        });
    }
}
