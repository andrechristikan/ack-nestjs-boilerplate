import {
    BadRequestException,
    ForbiddenException,
    Injectable,
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
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKey } from '@prisma/client';
import { PaginationService } from '@common/pagination/services/pagination.service';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    constructor(
        private readonly helperService: HelperService,
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly apiKeyUtil: ApiKeyUtil
    ) {}

    async getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>> {
        const { data, ...others } = await this.paginationService.offSet<ApiKey>(
            this.databaseService.apiKey,
            {
                ...params,
                where: {
                    ...where,
                    ...isActive,
                    ...type,
                },
            }
        );

        const apiKeys: ApiKeyResponseDto[] = this.apiKeyUtil.mapList(data);

        return {
            data: apiKeys,
            ...others,
        };
    }

    async findOneActiveByKeyAndCache(key: string): Promise<ApiKey | undefined> {
        const cached = await this.apiKeyUtil.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.databaseService.apiKey.findFirst({
            where: { key },
        });
        if (apiKey) {
            await this.apiKeyUtil.setCacheByKey(key, apiKey);
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

        const created = await this.databaseService.apiKey.create({
            data: {
                description,
                key,
                hash,
                isActive: true,
                type,
                startDate:
                    startDate && endDate
                        ? this.helperService.dateCreate(startDate, {
                              dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                          })
                        : null,
                endDate:
                    startDate && endDate
                        ? this.helperService.dateCreate(endDate, {
                              dayOf: ENUM_HELPER_DATE_DAY_OF.END,
                          })
                        : null,
            },
            select: {
                id: true,
                key: true,
            },
        });

        return { id: created.id, key: created.key, secret };
    }

    async active(id: string): Promise<ApiKeyResponseDto> {
        const today = this.helperService.dateCreate();
        const apiKey = await this.databaseService.apiKey.findUnique({
            where: { id },
            select: {
                id: true,
                key: true,
                isActive: true,
                startDate: true,
                endDate: true,
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
            this.databaseService.apiKey.update({
                where: { id },
                data: {
                    isActive: true,
                },
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return this.apiKeyUtil.mapOne(updated);
    }

    async inactive(id: string): Promise<ApiKeyResponseDto> {
        const apiKey = await this.databaseService.apiKey.findUnique({
            where: { id },
            select: {
                id: true,
                key: true,
                isActive: true,
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
            this.databaseService.apiKey.update({
                where: { id },
                data: {
                    isActive: false,
                },
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return this.apiKeyUtil.mapOne(updated);
    }

    async update(
        id: string,
        { description }: ApiKeyUpdateRequestDto
    ): Promise<ApiKeyResponseDto> {
        const apiKey = await this.databaseService.apiKey.findUnique({
            where: { id },
            select: {
                id: true,
                key: true,
                isActive: true,
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
            this.databaseService.apiKey.update({
                where: { id },

                data: {
                    description,
                },
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return this.apiKeyUtil.mapOne(updated);
    }

    async updateDate(
        id: string,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKeyResponseDto> {
        const apiKey = await this.databaseService.apiKey.findUnique({
            where: { id },
            select: {
                id: true,
                key: true,
                isActive: true,
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
            this.databaseService.apiKey.update({
                where: { id },
                data: {
                    startDate: this.helperService.dateCreate(startDate, {
                        dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                    }),
                    endDate: this.helperService.dateCreate(endDate, {
                        dayOf: ENUM_HELPER_DATE_DAY_OF.END,
                    }),
                },
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return this.apiKeyUtil.mapOne(updated);
    }

    async reset(id: string): Promise<ApiKeyCreateResponseDto> {
        const apiKey = await this.databaseService.apiKey.findUnique({
            where: { id },
            select: {
                id: true,
                key: true,
                isActive: true,
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
            this.databaseService.apiKey.update({
                where: { id },
                data: {
                    hash,
                },
                select: {
                    id: true,
                    key: true,
                },
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return { id: updated.id, key: updated.key, secret };
    }

    async delete(id: string): Promise<ApiKeyResponseDto> {
        const apiKey = await this.databaseService.apiKey.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
                key: true,
            },
        });
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        }

        const [deleted] = await Promise.all([
            this.databaseService.apiKey.delete({
                where: {
                    id,
                },
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        return this.apiKeyUtil.mapOne(deleted);
    }

    async validateXApiKey(request: IRequestApp): Promise<ApiKey> {
        const xApiKey: string[] =
            this.apiKeyUtil.extractKeyFromRequest(request)?.split(':') ?? [];
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
        const apiKey: ApiKey = await this.findOneActiveByKeyAndCache(key);

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
}
