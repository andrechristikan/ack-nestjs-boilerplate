import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKey, EnumApiKeyType, Prisma } from '@generated/prisma-client';
import {
    IApiKeyCreate,
    IApiKeyWithSecret,
} from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyService {
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKey>>;
    createByAdmin(data: IApiKeyCreate): Promise<IApiKeyWithSecret>;
    updateStatusByAdmin(id: string, isActive: boolean): Promise<ApiKey>;
    updateByAdmin(id: string, name?: string): Promise<ApiKey>;
    updateDatesByAdmin(
        id: string,
        startAt: Date,
        endAt: Date
    ): Promise<ApiKey>;
    resetByAdmin(id: string): Promise<IApiKeyWithSecret>;
    deleteByAdmin(id: string): Promise<ApiKey>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null>;
    validateXApiKey(xApiKeyHeader: string | null): Promise<ApiKey>;
    validateXApiKeyTypeGuard(
        apiKey: ApiKey | null,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean;
}
