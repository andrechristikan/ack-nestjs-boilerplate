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
import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
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
import { ApiKey, ENUM_API_KEY_TYPE } from '@prisma/client';
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

    async getList(
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

    async create({
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
                              dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                          })
                        : null,
                endAt:
                    startAt && endAt
                        ? this.helperService.dateCreate(endAt, {
                              dayOf: ENUM_HELPER_DATE_DAY_OF.END,
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

    async updateStatus(
        id: string,
        data: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>> {
        const today = this.helperService.dateCreate();
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (this.apiKeyUtil.isExpired(apiKey, today)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED,
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

    async update(
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

    async updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateDates(id, {
                startAt: this.helperService.dateCreate(startAt, {
                    dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                }),
                endAt: this.helperService.dateCreate(endAt, {
                    dayOf: ENUM_HELPER_DATE_DAY_OF.END,
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

    async reset(id: string): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
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

    async delete(id: string): Promise<IResponseReturn<ApiKeyDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
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
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (includeActive && !this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.INACTIVE,
                message: 'apiKey.error.inactive',
            });
        }

        return;
    }

    async findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null> {
        const cached = await this.apiKeyUtil.getCacheByKey(key);
        console.log('cached', cached);
        if (cached) {
            return cached;
        }

        const apiKey = await this.apiKeyRepository.findOneByKey(key);
        console.log('apiKey from db', apiKey);
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
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
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
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        const [key, secret] = xApiKey;
        console.log('key, secret', key, secret);
        const today = this.helperService.dateCreate();
        const apiKey: ApiKey = await this.findOneActiveByKeyAndCache(key);
        console.log('apiKey', apiKey);

        if (!apiKey) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                message: 'apiKey.error.xApiKey.notFound',
            });
        } else if (
            !this.apiKeyUtil.validateCredential(key, secret, apiKey) ||
            !this.apiKeyUtil.isValid(apiKey, today)
        ) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        return apiKey;
    }

    validateXApiKeyTypeGuard(
        request: IRequestApp,
        apiKeyTypes: ENUM_API_KEY_TYPE[]
    ): boolean {
        if (apiKeyTypes.length === 0) {
            throw new InternalServerErrorException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_PREDEFINED_NOT_FOUND,
                message: 'apiKey.error.xApiKey.predefinedNotFound',
            });
        }

        const { __apiKey } = request;
        if (!this.apiKeyUtil.validateType(__apiKey, apiKeyTypes)) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                message: 'apiKey.error.xApiKey.forbidden',
            });
        }

        return true;
    }
}
