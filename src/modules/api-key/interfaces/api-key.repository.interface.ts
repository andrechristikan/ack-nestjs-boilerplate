import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ApiKey } from '@generated/prisma-client/client';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyRepository {
    findWithPagination(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive: Record<string, IPaginationEqual> | null,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IApiKey>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        apiKeyId: string,
        { name, type, startAt, endAt }: IApiKeyCreate,
        key: string,
        hash: string
    ): Promise<IApiKey>;
    findOneById(id: string): Promise<IApiKey | null>;
    updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        expectedIsActive: boolean,
        isActive: boolean
    ): Promise<IApiKey>;
    updateNameInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        name: string
    ): Promise<IApiKey>;
    updateDatesInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        startAt: Date | null,
        endAt: Date | null
    ): Promise<IApiKey>;
    updateHashInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        hash: string
    ): Promise<IApiKey>;
    deleteInTx(tx: IDatabaseTransactionClient, id: string): Promise<IApiKey>;
    findOneByKey(key: string): Promise<ApiKey | null>;
}
