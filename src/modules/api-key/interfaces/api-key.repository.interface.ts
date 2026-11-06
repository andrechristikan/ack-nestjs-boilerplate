import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyRepository {
    findWithPagination(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive: Record<string, IPaginationEqual> | null,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IApiKey>>;
    create(
        apiKeyId: string,
        { name, type, startAt, endAt }: IApiKeyCreate,
        key: string,
        hash: string
    ): Promise<IApiKey>;
    findOneById(id: string): Promise<IApiKey | null>;
    updateStatus(
        id: string,
        expectedIsActive: boolean,
        isActive: boolean
    ): Promise<IApiKey | null>;
    updateName(id: string, name: string): Promise<IApiKey>;
    updateDates(
        id: string,
        startAt: Date,
        endAt: Date
    ): Promise<IApiKey | null>;
    updateHash(id: string, hash: string): Promise<IApiKey | null>;
    delete(id: string): Promise<boolean>;
    findOneByKey(key: string): Promise<ApiKey | null>;
}
