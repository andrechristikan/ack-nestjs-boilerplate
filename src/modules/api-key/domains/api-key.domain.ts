import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    ApiKey,
    EnumActivityLogAction,
    EnumApiKeyType,
    Prisma,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
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
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyDomain {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly apiKeyCredentialUtil: ApiKeyCredentialUtil,
        private readonly apiKeyCache: ApiKeyCache,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly activityLogDomain: ActivityLogDomain
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

    private stageActivityLog(
        action: EnumActivityLogAction,
        apiKey: ApiKey
    ): void {
        this.activityLogDomain.stage({
            action,
            metadata: this.apiKeyUtil.mapActivityLogMetadata(apiKey),
        });
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
            this.apiKeyCredentialUtil.generateCredential();
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

        this.stageActivityLog(EnumActivityLogAction.adminApiKeyCreate, created);

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
            this.apiKeyCache.deleteCacheByKey(apiKey.key),
        ]);

        this.stageActivityLog(
            EnumActivityLogAction.adminApiKeyUpdateStatus,
            updated
        );

        return updated;
    }

    async updateByAdmin(id: string, name?: string): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const [updated] = await Promise.all([
            name
                ? this.apiKeyRepository.updateName(id, name)
                : Promise.resolve(apiKey!),
            this.apiKeyCache.deleteCacheByKey(apiKey!.key),
        ]);

        this.stageActivityLog(EnumActivityLogAction.adminApiKeyUpdate, updated);

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
            this.apiKeyCache.deleteCacheByKey(apiKey!.key),
        ]);

        this.stageActivityLog(
            EnumActivityLogAction.adminApiKeyUpdateDate,
            updated
        );

        return updated;
    }

    async resetByAdmin(id: string): Promise<IApiKeyWithSecret> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const secret: string = this.apiKeyCredentialUtil.createSecret();
        const hash: string = this.apiKeyCredentialUtil.createHash(
            apiKey!.key,
            secret
        );
        const [updated] = await Promise.all([
            this.apiKeyRepository.updateHash(id, hash),
            this.apiKeyCache.deleteCacheByKey(apiKey!.key),
        ]);

        this.stageActivityLog(EnumActivityLogAction.adminApiKeyReset, updated);

        return { apiKey: updated, secret };
    }

    async deleteByAdmin(id: string): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const [deleted] = await Promise.all([
            this.apiKeyRepository.delete(id),
            this.apiKeyCache.deleteCacheByKey(apiKey.key),
        ]);

        this.stageActivityLog(EnumActivityLogAction.adminApiKeyDelete, deleted);

        return deleted;
    }

    async findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null> {
        const cached = await this.apiKeyCache.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.apiKeyRepository.findOneByKey(key);
        if (apiKey) {
            await this.apiKeyCache.setCacheByKey(key, apiKey);
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
            !this.apiKeyCredentialUtil.validateCredential(
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
