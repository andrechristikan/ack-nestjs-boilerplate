import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
    IPaginationQueryReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { ApiKey } from '@prisma/client';

export interface IApiKeyService {
    getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKey | undefined>;
    create({
        name,
        type,
        startDate,
        endDate,
    }: ApiKeyCreateRequestDto): Promise<ApiKeyCreateResponseDto>;
    active(id: string): Promise<ApiKeyResponseDto>;
    inactive(id: string): Promise<ApiKeyResponseDto>;
    update(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<ApiKeyResponseDto>;
    updateDate(
        id: string,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKeyResponseDto>;
    reset(id: string): Promise<ApiKeyCreateResponseDto>;
    delete(id: string): Promise<ApiKeyResponseDto>;
    validateXApiKey(request: IRequestApp): Promise<ApiKey>;
}
