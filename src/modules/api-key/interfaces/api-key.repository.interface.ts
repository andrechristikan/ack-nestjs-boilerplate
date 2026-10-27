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
import type { IApiKeyList } from '@modules/api-key/interfaces/api-key.interface';

export interface IApiKeyRepository {
    /** Extra caller-supplied constraint, AND-composed first. */
    findWithPagination(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive: Record<string, IPaginationEqual> | undefined,
        type: Record<string, IPaginationIn> | undefined,
        additionalWhere: Prisma.ApiKeyWhereInput
    ): Promise<IResponsePaginationReturn<IApiKeyList>>;
    create(
        apiKeyId: string,
        { name, type, startAt, endAt }: ApiKeyCreateRequestDto,
        key: string,
        hash: string
    ): Promise<ApiKey>;
    findOneById(id: string): Promise<ApiKey | null>;
    updateStatus(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<ApiKey | null>;
    updateName(id: string, name: string): Promise<ApiKey | null>;
    updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKey | null>;
    updateHash(id: string, hash: string): Promise<ApiKey | null>;
    delete(id: string): Promise<ApiKey | null>;
    findOneByKey(key: string): Promise<ApiKey | null>;
}
