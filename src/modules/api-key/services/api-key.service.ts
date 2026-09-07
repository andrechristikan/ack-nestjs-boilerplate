import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKey, EnumApiKeyType, Prisma } from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyStartAtNotFutureException } from '@modules/api-key/exceptions/api-key.start-at-not-future.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';
import { ApiKeyXApiKeyPredefinedNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-predefined-not-found.exception';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';
import {
    IApiKeyCreate,
    IApiKeyWithSecret,
} from '@modules/api-key/interfaces/api-key.interface';
import { IApiKeyService } from '@modules/api-key/interfaces/api-key.service.interface';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyCacheService } from '@modules/api-key/services/api-key.cache.service';
import { ApiKeyCredentialService } from '@modules/api-key/services/api-key.credential.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly apiKeyCredentialService: ApiKeyCredentialService,
        private readonly apiKeyCacheService: ApiKeyCacheService,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly requestStoreService: RequestStoreService
    ) {}

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

    private validateStartAtIsFuture(startAt: Date): void {
        if (startAt <= this.helperDateService.create()) {
            throw new ApiKeyStartAtNotFutureException();
        }

        return;
    }

    private storeActivityLogMetadata(apiKey: ApiKey): void {
        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.apiKeyUtil.mapActivityLogMetadata(apiKey)
        );

        return;
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKey>> {
        return this.apiKeyRepository.findWithPagination(
            pagination,
            isActive,
            type
        );
    }

    async createByAdmin({
        startAt,
        endAt,
        ...others
    }: IApiKeyCreate): Promise<IApiKeyWithSecret> {
        if (startAt) {
            this.validateStartAtIsFuture(startAt);
        }

        const { key, secret, hash } =
            this.apiKeyCredentialService.generateCredential();
        const created = await this.apiKeyRepository.create(
            {
                ...others,
                startAt:
                    startAt && endAt
                        ? this.helperDateService.create(startAt, {
                              dayOf: EnumHelperDateDayOf.start,
                          })
                        : undefined,
                endAt:
                    startAt && endAt
                        ? this.helperDateService.create(endAt, {
                              dayOf: EnumHelperDateDayOf.end,
                          })
                        : undefined,
            },
            key,
            hash
        );

        this.storeActivityLogMetadata(created);

        return { apiKey: created, secret };
    }

    async updateStatusByAdmin(id: string, isActive: boolean): Promise<ApiKey> {
        const today = this.helperDateService.create();
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
            this.apiKeyRepository.updateStatus(id, { isActive }),
            this.apiKeyCacheService.deleteCacheByKey(apiKey.key),
        ]);

        this.storeActivityLogMetadata(updated);

        return updated;
    }

    async updateByAdmin(id: string, name?: string): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const [updated] = await Promise.all([
            name
                ? this.apiKeyRepository.updateName(id, name)
                : Promise.resolve(apiKey!),
            this.apiKeyCacheService.deleteCacheByKey(apiKey!.key),
        ]);

        this.storeActivityLogMetadata(updated);

        return updated;
    }

    async updateDatesByAdmin(
        id: string,
        startAt: Date,
        endAt: Date
    ): Promise<ApiKey> {
        this.validateStartAtIsFuture(startAt);

        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const newStartAt = this.helperDateService.create(startAt, {
            dayOf: EnumHelperDateDayOf.start,
        });
        const newEndAt = this.helperDateService.create(endAt, {
            dayOf: EnumHelperDateDayOf.end,
        });

        const [updated] = await Promise.all([
            this.apiKeyRepository.updateDates(id, {
                startAt: newStartAt,
                endAt: newEndAt,
            }),
            this.apiKeyCacheService.deleteCacheByKey(apiKey!.key),
        ]);

        this.storeActivityLogMetadata(updated);

        return updated;
    }

    async resetByAdmin(id: string): Promise<IApiKeyWithSecret> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const secret: string = this.apiKeyCredentialService.createSecret();
        const hash: string = this.apiKeyCredentialService.createHash(
            apiKey!.key,
            secret
        );
        const [updated] = await Promise.all([
            this.apiKeyRepository.updateHash(id, hash),
            this.apiKeyCacheService.deleteCacheByKey(apiKey!.key),
        ]);

        this.storeActivityLogMetadata(updated);

        return { apiKey: updated, secret };
    }

    async deleteByAdmin(id: string): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const [deleted] = await Promise.all([
            this.apiKeyRepository.delete(id),
            this.apiKeyCacheService.deleteCacheByKey(apiKey.key),
        ]);

        this.storeActivityLogMetadata(deleted);

        return deleted;
    }

    async findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null> {
        const cached = await this.apiKeyCacheService.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.apiKeyRepository.findOneByKey(key);
        if (apiKey) {
            await this.apiKeyCacheService.setCacheByKey(key, apiKey);
        }

        return apiKey;
    }

    async validateXApiKey(xApiKeyHeader: string | null): Promise<ApiKey> {
        const xApiKeyTrimmed = xApiKeyHeader?.trim();
        if (!xApiKeyTrimmed) {
            throw new ApiKeyXApiKeyRequiredException();
        }

        const xApiKey: string[] = xApiKeyTrimmed.split(':');
        if (
            xApiKey.length !== 2 ||
            !xApiKey[0]?.trim() ||
            !xApiKey[1]?.trim()
        ) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const [key, secret] = xApiKey;
        const today = this.helperDateService.create();
        const apiKey = await this.findOneActiveByKeyAndCache(key);

        if (!apiKey) {
            throw new ApiKeyXApiKeyNotFoundException();
        } else if (
            !this.apiKeyCredentialService.validateCredential(
                key,
                secret,
                apiKey
            ) ||
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
