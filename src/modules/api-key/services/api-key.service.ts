import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { HelperService } from '@common/helper/services/helper.service';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { IApiKeyService } from '@modules/api-key/interfaces/api-key.service.interface';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from '@modules/api-key/repository/repositories/api-key.repository';
import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import {
    IDatabaseFilterOperation,
    IDatabaseFilterOperationComparison,
} from '@common/database/interfaces/database.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { Types } from 'mongoose';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    private readonly keyPrefix: string;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly apiKeyUtil: ApiKeyUtil
    ) {
        this.keyPrefix = this.configService.get<string>(
            'auth.xApiKey.keyPrefix'
        )!;
    }

    async findAllWithPagination(
        { search, limit, skip, order }: IPaginationQueryReturn,
        isActive?: Record<string, IDatabaseFilterOperationComparison>,
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>> {
        const { items, ...others } =
            await this.apiKeyRepository.findManyWithPagination({
                where: {
                    ...search,
                    ...isActive,
                    ...type,
                },
                limit: limit,
                skip: skip,
                order: order,
            });

        const apiKeys: ApiKeyResponseDto[] = this.mapList(items);

        return {
            data: apiKeys,
            ...others,
        };
    }

    mapList(apiKeys: ApiKeyEntity[]): ApiKeyResponseDto[] {
        return plainToInstance(ApiKeyResponseDto, apiKeys);
    }

    mapOne(apiKey: ApiKeyEntity): ApiKeyResponseDto {
        return plainToInstance(ApiKeyResponseDto, apiKey);
    }

    async findOneByIdAndCache(_id: string): Promise<ApiKeyEntity> {
        const apiKey = await this.apiKeyRepository.findOneById({
            where: { _id: new Types.ObjectId(_id) },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        }

        await this.setCacheByKey(apiKey.key, apiKey);

        return apiKey;
    }

    async findOneActiveByKeyAndCache(
        key: string
    ): Promise<ApiKeyEntity | undefined> {
        const cached = await this.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.apiKeyRepository.findOne({
            where: {
                key,
            },
        });
        if (apiKey) {
            await this.setCacheByKey(key, apiKey);
        }

        return apiKey;
    }

    async create({
        description,
        type,
        startDate,
        endDate,
    }: ApiKeyCreateRequestDto): Promise<ApiKeyCreateResponseDto> {
        const key = this.apiKeyUtil.createKey();
        const secret = this.apiKeyUtil.createSecret();
        const hash: string = this.apiKeyUtil.createHash(key, secret);

        const data: ApiKeyEntity = new ApiKeyEntity();
        data.description = description;
        data.key = key;
        data.hash = hash;
        data.isActive = true;
        data.type = type;

        if (startDate && endDate) {
            data.startDate = this.helperService.dateCreate(startDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.START,
            });
            data.endDate = this.helperService.dateCreate(endDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.END,
            });
        }

        const created: ApiKeyEntity = await this.apiKeyRepository.create({
            data,
        });

        return { _id: created._id, key: created.key, secret };
    }

    async active(apiKeyId: string): Promise<ApiKeyResponseDto> {
        const today = this.helperService.dateCreate();
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById({
            where: {
                _id: new Types.ObjectId(apiKeyId),
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.ACTIVE_ALREADY,
                message: 'apiKey.error.activeAlready',
            });
        } else if (this.apiKeyUtil.isExpired(apiKey, today)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED,
                message: 'apiKey.error.expired',
            });
        } else if (this.apiKeyUtil.isNotYetActive(apiKey, today)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_YET_ACTIVE,
                message: 'apiKey.error.notYetActive',
            });
        }

        const [updated] = await Promise.all([
            this.apiKeyRepository.update({
                where: {
                    _id: apiKey._id,
                },
                data: {
                    isActive: true,
                },
            }),
            this.deleteCacheByKey(apiKey.key),
        ]);

        return this.mapOne(updated);
    }

    async inactive(apiKeyId: string): Promise<ApiKeyResponseDto> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById({
            where: {
                _id: new Types.ObjectId(apiKeyId),
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (!this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.INACTIVE_ALREADY,
                message: 'apiKey.error.inactiveAlready',
            });
        }

        const [updated] = await Promise.all([
            this.apiKeyRepository.update({
                where: {
                    _id: apiKey._id,
                },
                data: {
                    isActive: false,
                },
            }),
            this.deleteCacheByKey(apiKey.key),
        ]);

        return this.mapOne(updated);
    }

    async update(
        apiKeyId: string,
        { description }: ApiKeyUpdateRequestDto
    ): Promise<ApiKeyResponseDto> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById({
            where: {
                _id: new Types.ObjectId(apiKeyId),
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (!this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.INACTIVE,
                message: 'apiKey.error.inactive',
            });
        }

        const [updated] = await Promise.all([
            this.apiKeyRepository.update({
                where: {
                    _id: apiKey._id,
                },
                data: {
                    description,
                },
            }),
            this.deleteCacheByKey(apiKey.key),
        ]);

        return this.mapOne(updated);
    }

    async updateDate(
        apiKeyId: string,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKeyResponseDto> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById({
            where: {
                _id: new Types.ObjectId(apiKeyId),
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (!this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.INACTIVE,
                message: 'apiKey.error.inactive',
            });
        }

        const [updated] = await Promise.all([
            this.apiKeyRepository.update({
                where: {
                    _id: apiKey._id,
                },
                data: {
                    startDate: this.helperService.dateCreate(startDate, {
                        dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                    }),
                    endDate: this.helperService.dateCreate(endDate, {
                        dayOf: ENUM_HELPER_DATE_DAY_OF.END,
                    }),
                },
            }),
            this.deleteCacheByKey(apiKey.key),
        ]);

        return this.mapOne(updated);
    }

    async reset(apiKeyId: string): Promise<ApiKeyCreateResponseDto> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById({
            where: {
                _id: new Types.ObjectId(apiKeyId),
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        } else if (!this.apiKeyUtil.isActive(apiKey)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.INACTIVE,
                message: 'apiKey.error.inactive',
            });
        }

        const secret: string = this.apiKeyUtil.createSecret();
        const hash: string = this.apiKeyUtil.createHash(apiKey.key, secret);

        const [updated] = await Promise.all([
            this.apiKeyRepository.update({
                where: {
                    _id: apiKey._id,
                },
                data: {
                    hash,
                },
            }),
            this.deleteCacheByKey(apiKey.key),
        ]);

        return { _id: updated._id, key: updated.key, secret };
    }

    async delete(apiKeyId: string): Promise<ApiKeyResponseDto> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById({
            where: {
                _id: new Types.ObjectId(apiKeyId),
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        }

        const [deleted] = await Promise.all([
            this.apiKeyRepository.softDelete({
                where: {
                    _id: apiKey._id,
                },
            }),
            this.deleteCacheByKey(apiKey.key),
        ]);

        return this.mapOne(deleted);
    }

    async getCacheByKey(key: string): Promise<ApiKeyEntity | null | undefined> {
        const cacheKey = `${this.keyPrefix}:${key}`;
        const cachedApiKey = await this.cacheManager.get<string>(cacheKey);
        if (cachedApiKey) {
            return JSON.parse(cachedApiKey) as ApiKeyEntity;
        }

        return null;
    }

    async setCacheByKey(key: string, apiKey: ApiKeyEntity): Promise<void> {
        const cacheKey = `${this.keyPrefix}:${key}`;
        await this.cacheManager.set(cacheKey, JSON.stringify(apiKey));

        return;
    }

    async deleteCacheByKey(key: string): Promise<void> {
        const cacheKey = `${this.keyPrefix}:${key}`;
        await this.cacheManager.del(cacheKey);

        return;
    }

    async validateXApiKey(request: IRequestApp): Promise<ApiKeyEntity> {
        const xApiKey: string[] = this.apiKeyUtil
            .extractKeyFromRequest(request)
            .split(':');
        if (!xApiKey || xApiKey.length === 0) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                message: 'apiKey.error.xApiKey.required',
            });
        } else if (xApiKey.length !== 2) {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        const [key, secret] = xApiKey;
        const today = this.helperService.dateCreate();
        const apiKey: ApiKeyEntity = await this.findOneActiveByKeyAndCache(key);

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

    validateXApiKeyType(
        request: IRequestApp,
        allowed: ENUM_API_KEY_TYPE[]
    ): ApiKeyEntity {
        const { __apiKey } = request;
        if (this.apiKeyUtil.validateType(__apiKey, allowed)) {
            throw new ForbiddenException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                message: 'apiKey.error.xApiKey.forbidden',
            });
        }

        return __apiKey;
    }
}
