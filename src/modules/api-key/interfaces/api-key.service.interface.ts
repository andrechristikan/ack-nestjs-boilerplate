import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKey, EnumApiKeyType, Prisma } from '@generated/prisma-client';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';

export interface IApiKeyService {
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.ApiKeySelect,
            Prisma.ApiKeyWhereInput
        >,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>>;
    createByAdmin({
        startAt,
        endAt,
        ...others
    }: ApiKeyCreateRequestDto): Promise<
        IResponseReturn<ApiKeyCreateResponseDto>
    >;
    updateStatusByAdmin(
        id: string,
        data: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKeyResponseDto>>;
    updateByAdmin(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<ApiKeyResponseDto>>;
    updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKeyResponseDto>>;
    resetByAdmin(id: string): Promise<IResponseReturn<ApiKeyCreateResponseDto>>;
    deleteByAdmin(id: string): Promise<IResponseReturn<ApiKeyResponseDto>>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null>;
    validateXApiKeyGuard(request: IRequestApp): Promise<ApiKey>;
    validateXApiKeyTypeGuard(
        apiKey: ApiKey | null,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean;
}
