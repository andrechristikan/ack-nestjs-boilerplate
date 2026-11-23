import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
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
import type { ApiKey, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ApiKeyRepository implements IApiKeyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPagination(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive: Record<string, IPaginationEqual> | null,
        type: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        return this.paginationService.offset(
            this.databaseService.client.apiKey,
            {
                ...params,
                where: {
                    AND: [
                        additionalWhere ?? {},
                        { ...where, ...isActive, ...type },
                    ],
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

    async findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IApiKey | null> {
        return tx.apiKey.findFirst({
            where: {
                AND: [additionalWhere ?? {}, { id }],
            },
            select: ApiKeySelect,
        });
    }

    async updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        expectedIsActive: boolean,
        isActive: boolean
    ): Promise<IApiKey | null> {
        const { count } = await tx.apiKey.updateMany({
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

        return this.findOneByIdInTx(tx, id, null);
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
    ): Promise<IApiKey | null> {
        const { count } = await tx.apiKey.updateMany({
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

        return this.findOneByIdInTx(tx, id, null);
    }

    async updateHashInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        hash: string
    ): Promise<IApiKey | null> {
        const { count } = await tx.apiKey.updateMany({
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

        return this.findOneByIdInTx(tx, id, null);
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<boolean> {
        const { count } = await tx.apiKey.deleteMany({
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
