import { Injectable } from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { IApiKeyService } from '@modules/api-key/interfaces/api-key.service.interface';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';
import { ApiKeyXApiKeyPredefinedNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-predefined-not-found.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
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
import { ApiKey, EnumApiKeyType, Prisma } from '@generated/prisma-client';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    constructor(
        private readonly helperService: HelperService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.ApiKeySelect,
            Prisma.ApiKeyWhereInput
        >,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>> {
        const { data, ...others } =
            await this.apiKeyRepository.findWithPagination(
                pagination,
                isActive,
                type
            );
        const apiKeys: ApiKeyResponseDto[] = this.apiKeyUtil.mapList(data);

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
                        : undefined,
                endAt:
                    startAt && endAt
                        ? this.helperService.dateCreate(endAt, {
                              dayOf: EnumHelperDateDayOf.end,
                          })
                        : undefined,
            },
            key,
            hash
        );

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(created)
        );

        return {
            data: this.apiKeyUtil.mapCreate(created, secret),
        };
    }

    async updateStatusByAdmin(
        id: string,
        data: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const today = this.helperService.dateCreate();
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        } else if (
            apiKey.startAt &&
            apiKey.endAt &&
            this.apiKeyUtil.isExpired(
                {
                    startAt: apiKey.startAt,
                    endAt: apiKey.endAt,
                },
                today
            )
        ) {
            throw new ApiKeyExpiredException();
        }

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateStatus(id, data),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(updated)
        );

        return {
            data: this.apiKeyUtil.mapOne(updated),
        };
    }

    async updateByAdmin(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const [updated] = await Promise.all([
            name
                ? this.apiKeyRepository.updateName(id, name)
                : Promise.resolve(apiKey!),
            this.apiKeyUtil.deleteCacheByKey(apiKey!.key),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(updated)
        );

        return {
            data: this.apiKeyUtil.mapOne(updated),
        };
    }

    async updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const newStartAt = this.helperService.dateCreate(startAt, {
            dayOf: EnumHelperDateDayOf.start,
        });
        const newEndAt = this.helperService.dateCreate(endAt, {
            dayOf: EnumHelperDateDayOf.end,
        });

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateDates(id, {
                startAt: newStartAt,
                endAt: newEndAt,
            }),
            this.apiKeyUtil.deleteCacheByKey(apiKey!.key),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(updated)
        );

        return {
            data: this.apiKeyUtil.mapOne(updated),
        };
    }

    async resetByAdmin(
        id: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const secret: string = this.apiKeyUtil.createSecret();
        const hash: string = this.apiKeyUtil.createHash(apiKey!.key, secret);
        const [updated] = await Promise.all([
            this.apiKeyRepository.updateHash(id, hash),
            this.apiKeyUtil.deleteCacheByKey(apiKey!.key),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(updated)
        );

        return {
            data: this.apiKeyUtil.mapCreate(updated, secret),
        };
    }

    async deleteByAdmin(
        id: string
    ): Promise<IResponseReturn<ApiKeyResponseDto>> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const [deleted] = await Promise.all([
            this.apiKeyRepository.delete(id),
            this.apiKeyUtil.deleteCacheByKey(apiKey.key),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(deleted)
        );

        return {
            data: this.apiKeyUtil.mapOne(deleted),
        };
    }

    private validateApiKey(
        apiKey?: ApiKey | null,
        includeActive: boolean = false
    ): void {
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        } else if (includeActive && !this.apiKeyUtil.isActive(apiKey)) {
            throw new ApiKeyInactiveException();
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
        const xApiKeyHeader = this.apiKeyUtil
            .extractKeyFromRequest(request)
            .trim();
        if (!xApiKeyHeader) {
            throw new ApiKeyXApiKeyRequiredException();
        }

        const xApiKey: string[] = xApiKeyHeader.split(':');
        if (
            xApiKey.length !== 2 ||
            !xApiKey[0]?.trim() ||
            !xApiKey[1]?.trim()
        ) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const [key, secret] = xApiKey;
        const today = this.helperService.dateCreate();
        const apiKey = await this.findOneActiveByKeyAndCache(key);

        if (!apiKey) {
            throw new ApiKeyXApiKeyNotFoundException();
        } else if (
            !this.apiKeyUtil.validateCredential(key, secret, apiKey) ||
            !this.apiKeyUtil.isValid(
                {
                    isActive: apiKey.isActive,
                    startAt: apiKey.startAt,
                    endAt: apiKey.endAt,
                },
                today
            )
        ) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        return apiKey;
    }

    validateXApiKeyTypeGuard(
        apiKey: ApiKey | null,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean {
        if (apiKeyTypes.length === 0) {
            throw new ApiKeyXApiKeyPredefinedNotFoundException();
        }

        if (!apiKey || !this.apiKeyUtil.validateType(apiKey, apiKeyTypes)) {
            throw new ApiKeyXApiKeyForbiddenException();
        }

        return true;
    }
}
