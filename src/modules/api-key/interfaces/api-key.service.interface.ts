import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKey, ENUM_API_KEY_TYPE } from '@prisma/client';

export interface IApiKeyService {
    getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyDto>>;
    create({
        name,
        type,
        startDate,
        endDate,
    }: ApiKeyCreateRequestDto): Promise<ApiKeyCreateResponseDto>;
    active(id: string): Promise<ApiKeyDto>;
    inactive(id: string): Promise<ApiKeyDto>;
    update(id: string, { name }: ApiKeyUpdateRequestDto): Promise<ApiKeyDto>;
    updateDate(
        id: string,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKeyDto>;
    reset(id: string): Promise<ApiKeyCreateResponseDto>;
    delete(id: string): Promise<ApiKeyDto>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null>;
    validateXApiKeyGuard(request: IRequestApp): Promise<ApiKey>;
    validateXApiKeyTypeGuard(
        request: IRequestApp,
        apiKeyTypes: ENUM_API_KEY_TYPE[]
    ): boolean;
}
