import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyRepository {
    findWithPagination(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IApiKey>>;
    create(
        apiKeyId: string,
        { name, type, startAt, endAt }: ApiKeyCreateRequestDto,
        key: string,
        hash: string
    ): Promise<IApiKey>;
    findOneById(id: string): Promise<IApiKey | null>;
    updateStatus(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<IApiKey>;
    updateName(id: string, name: string): Promise<IApiKey>;
    updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IApiKey>;
    updateHash(id: string, hash: string): Promise<IApiKey>;
    delete(id: string): Promise<IApiKey>;
    findOneByKey(key: string): Promise<ApiKey | null>;
}
