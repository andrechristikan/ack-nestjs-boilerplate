import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { IApiKeyService } from '@modules/api-key/interfaces/api-key.service.interface';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKey, EnumApiKeyType } from '@prisma/client';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    constructor(
        private readonly helperService: HelperService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly apiKeyRepository: ApiKeyRepository
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyDto>> {
        const { data, ...others } =
            await this.apiKeyRepository.findWithPagination(
                pagination,
                isActive,
                type
            );
        const apiKeys: ApiKeyDto[] = this.apiKeyUtil.mapList(data);

        return {
            data: apiKeys,
            ...others,
        };
    }

    async createByAdmin({
        startAt,
        endAt,
        ...others
    }: ApiKeyCreateRequestDto): Promise<
        IResponseReturn<ApiKeyCreateResponseDto>
    > {
        const { key, secret, hash } = this.apiKeyUtil.generateCredential();
        const created = await this.apiKeyRepository.create(
            {
                ...others,
                startAt:
                    startAt && endAt
                        ? this.helperService.dateCreate(startAt, {
                              dayOf: EnumHelperDateDayOf.start,
                          })
                        : null,
                endAt:
                    startAt && endAt
                        ? this.helperService.dateCreate(endAt, {
                              dayOf: EnumHelperDateDayOf.end,
                          })
                        : null,
            },
            key,
            hash
        );

        return {
            data: this.apiKeyUtil.mapCreate(created, secret),
            metadataActivityLog:
                this.apiKeyUtil.mapActivityLogMetadata(created),
        };
    }

    async updateStatusByAdmin(
        id: string,
        data: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>> {
        const today = this.helperService.dateCreate();
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: EnumApiKeyStatusCodeError.notFound,
                message: 'apiKey.error.notFound',
            });
        } else if (this.apiKeyUtil.isExpired(apiKey, today)) {
            throw new BadRequestException({
                statusCode: EnumApiKeyStatusCodeError.expired,
                message: 'apiKey.error.expired',
            });
        }

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateStatus(id, data),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return {
            data: this.apiKeyUtil.mapOne(updated),
            metadataActivityLog:
                this.apiKeyUtil.mapActivityLogMetadata(updated),
        };
    }

    async updateByAdmin(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateName(id, name),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return {
            data: this.apiKeyUtil.mapOne(updated),
            metadataActivityLog:
                this.apiKeyUtil.mapActivityLogMetadata(updated),
        };
    }

    async updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateDates(id, {
                startAt: this.helperService.dateCreate(startAt, {
                    dayOf: EnumHelperDateDayOf.start,
                }),
                endAt: this.helperService.dateCreate(endAt, {
                    dayOf: EnumHelperDateDayOf.end,
                }),
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return {
            data: this.apiKeyUtil.mapOne(updated),
            metadataActivityLog:
                this.apiKeyUtil.mapActivityLogMetadata(updated),
        };
    }

    async resetByAdmin(
        id: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const secret: string = this.apiKeyUtil.createSecret();
        const hash: string = this.apiKeyUtil.createHash(apiKey.key, secret);
        const [updated] = await Promise.all([
            this.apiKeyRepository.updateHash(id, hash),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return {
            data: this.apiKeyUtil.mapCreate(updated, secret),
            metadataActivityLog:
                this.apiKeyUtil.mapActivityLogMetadata(updated),
        };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<ApiKeyDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: EnumApiKeyStatusCodeError.notFound,
                message: 'apiKey.error.notFound',
            });
        }

        const [deleted] = await Promise.all([
            this.apiKeyRepository.delete(id),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return {
            data: this.apiKeyUtil.mapOne(deleted),
            metadataActivityLog:
                this.apiKeyUtil.mapActivityLogMetadata(deleted),
        };
    }

    validateApiKey(apiKey: ApiKey, includeActive: boolean = false): void {
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: EnumApiKeyStatusCodeError.notFound,
                message: 'apiKey.error.notFound',
            });
        } else if (includeActive && !this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: EnumApiKeyStatusCodeError.inactive,
                message: 'apiKey.error.inactive',
            });
        }

        return;
    }

    async findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null> {
        const cached = await this.apiKeyUtil.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.apiKeyRepository.findOneByKey(key);
        if (apiKey) {
            await this.apiKeyUtil.setCacheByKey(key, apiKey);
        }

        return apiKey;
    }

    async validateXApiKeyGuard(request: IRequestApp): Promise<ApiKey> {
        const xApiKeyHeader: string = this.apiKeyUtil
            .extractKeyFromRequest(request)
            ?.trim();
        if (!xApiKeyHeader) {
            throw new UnauthorizedException({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                message: 'apiKey.error.xApiKey.required',
            });
        }

        const xApiKey: string[] = xApiKeyHeader.split(':');
        if (
            xApiKey.length !== 2 ||
            !xApiKey[0]?.trim() ||
            !xApiKey[1]?.trim()
        ) {
            throw new UnauthorizedException({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        const [key, secret] = xApiKey;
        const today = this.helperService.dateCreate();
        const apiKey: ApiKey = await this.findOneActiveByKeyAndCache(key);

        if (!apiKey) {
            throw new ForbiddenException({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyNotFound,
                message: 'apiKey.error.xApiKey.notFound',
            });
        } else if (
            !this.apiKeyUtil.validateCredential(key, secret, apiKey) ||
            !this.apiKeyUtil.isValid(apiKey, today)
        ) {
            throw new UnauthorizedException({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        return apiKey;
    }

    validateXApiKeyTypeGuard(
        request: IRequestApp,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean {
        if (apiKeyTypes.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyPredefinedNotFound,
                message: 'apiKey.error.xApiKey.predefinedNotFound',
            });
        }

        const { __apiKey } = request;
        if (!this.apiKeyUtil.validateType(__apiKey, apiKeyTypes)) {
            throw new ForbiddenException({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                message: 'apiKey.error.xApiKey.forbidden',
            });
        }

        return true;
    }
}
