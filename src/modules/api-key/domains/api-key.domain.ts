import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyStartAtNotFutureException } from '@modules/api-key/exceptions/api-key.start-at-not-future.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';
import { ApiKeyXApiKeyPredefinedNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-predefined-not-found.exception';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';
import type {
    IApiKeyCreate,
    IApiKeyList,
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
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private validateApiKey(
        apiKey?: ApiKey | null,
        includeActive: boolean = false
    ): asserts apiKey is ApiKey {
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        if (includeActive) {
            const isActive = this.apiKeyUtil.isActive(apiKey);
            if (!isActive) {
                throw new ApiKeyInactiveException();
            }
        }

        return;
    }

    private validateStartAtIsFuture(startAt: Date): void {
        const now = this.helperDateService.create();
        if (startAt <= now) {
            throw new ApiKeyStartAtNotFutureException();
        }

        return;
    }

    private prepareActivityLog(
        action: EnumActivityLogAction,
        apiKey: Pick<ApiKey, 'id' | 'name' | 'type'>,
        timestamp: Date,
        onError: boolean
    ): IActivityLogStagedEvent {
        const metadata = this.apiKeyUtil.mapActivityLogMetadata(
            apiKey,
            timestamp
        );

        return this.activityLogDomain.prepare({
            action,
            metadata,
            onError,
        });
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IApiKeyList>> {
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
        const apiKeyId = this.databaseUtil.createId();
        const createdAt = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyCreate,
                { id: apiKeyId, name: others.name, type: others.type },
                createdAt,
                false
            ),
        ];
        let startAtDay: Date | undefined;
        let endAtDay: Date | undefined;
        if (startAt && endAt) {
            startAtDay = this.helperDateService.create(startAt, {
                dayOf: EnumHelperDateDayOf.start,
            });
            endAtDay = this.helperDateService.create(endAt, {
                dayOf: EnumHelperDateDayOf.end,
            });
        } else {
            startAtDay = undefined;
            endAtDay = undefined;
        }
        const created = await this.apiKeyRepository.create(
            apiKeyId,
            {
                ...others,
                startAt: startAtDay,
                endAt: endAtDay,
            },
            key,
            hash
        );

        this.activityLogDomain.stagePrepared(events);

        return { apiKey: created, secret };
    }

    async updateStatusByAdmin(id: string, isActive: boolean): Promise<ApiKey> {
        const today = this.helperDateService.create();
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const isExpired = this.apiKeyUtil.isExpired(
            {
                startAt: apiKey.startAt,
                endAt: apiKey.endAt,
            },
            today
        );
        if (apiKey.startAt && apiKey.endAt && isExpired) {
            throw new ApiKeyExpiredException();
        }

        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdateStatus,
                apiKey,
                today,
                true
            ),
        ];
        const updated = await this.apiKeyRepository.updateStatus(id, {
            isActive,
        });
        this.activityLogDomain.stagePrepared(events);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return updated;
    }

    async updateByAdmin(id: string, name?: string): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const updatedAt = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdate,
                {
                    id: apiKey.id,
                    type: apiKey.type,
                    name: name ?? apiKey.name,
                },
                updatedAt,
                true
            ),
        ];
        let updated: ApiKey;
        if (name) {
            updated = await this.apiKeyRepository.updateName(id, name);
        } else {
            updated = apiKey;
        }
        this.activityLogDomain.stagePrepared(events);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

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

        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdateDate,
                apiKey,
                timestamp,
                true
            ),
        ];
        const updated = await this.apiKeyRepository.updateDates(id, {
            startAt: newStartAt,
            endAt: newEndAt,
        });
        this.activityLogDomain.stagePrepared(events);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return updated;
    }

    async resetByAdmin(id: string): Promise<IApiKeyWithSecret> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const secret: string = this.apiKeyCredentialUtil.createSecret();
        const hash: string = this.apiKeyCredentialUtil.createHash(
            apiKey.key,
            secret
        );
        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyReset,
                apiKey,
                timestamp,
                true
            ),
        ];
        const updated = await this.apiKeyRepository.updateHash(id, hash);
        this.activityLogDomain.stagePrepared(events);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return { apiKey: updated, secret };
    }

    async deleteByAdmin(id: string): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyDelete,
                apiKey,
                timestamp,
                true
            ),
        ];
        const deleted = await this.apiKeyRepository.delete(id);
        this.activityLogDomain.stagePrepared(events);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

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
        }

        const isCredentialValid = this.apiKeyCredentialUtil.validateCredential(
            key,
            secret,
            apiKey
        );
        const isKeyValid = this.apiKeyUtil.isValid(
            {
                isActive: apiKey.isActive,
                startAt: apiKey.startAt,
                endAt: apiKey.endAt,
            },
            today
        );
        if (!isCredentialValid || !isKeyValid) {
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

        if (!apiKey) {
            throw new ApiKeyXApiKeyForbiddenException();
        }

        const isTypeAllowed = this.apiKeyUtil.validateType(apiKey, apiKeyTypes);
        if (!isTypeAllowed) {
            throw new ApiKeyXApiKeyForbiddenException();
        }

        return true;
    }
}
