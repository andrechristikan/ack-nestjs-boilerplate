import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKey, Prisma } from '@generated/prisma-client';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';

export interface IApiKeyHttpService {
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKey>>;
    createByAdmin(
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>>;
    updateStatusByAdmin(
        id: string,
        body: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKey>>;
    updateByAdmin(
        id: string,
        body: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<ApiKey>>;
    updateDatesByAdmin(
        id: string,
        body: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKey>>;
    resetByAdmin(id: string): Promise<IResponseReturn<ApiKeyCreateResponseDto>>;
    deleteByAdmin(id: string): Promise<IResponseReturn<ApiKey>>;
}
