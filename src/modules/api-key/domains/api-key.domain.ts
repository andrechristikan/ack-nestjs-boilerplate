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
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyStartAtNotFutureException } from '@modules/api-key/exceptions/api-key.start-at-not-future.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';
import type {
    IApiKey,
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
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private validateApiKey(
        apiKey: IApiKey | null,
        includeActive: boolean = false
    ): asserts apiKey is IApiKey {
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
    ): IActivityLogStaged {
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
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        return this.apiKeyRepository.findWithPagination(
            pagination,
            isActive ?? null,
            type ?? null
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
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyCreate,
                { id: apiKeyId, name: others.name, type: others.type },
                createdAt,
                false
            ),
        ];
        let dateWindow: { startAt: Date | null; endAt: Date | null } = {
            startAt: null,
            endAt: null,
        };
        if (startAt && endAt) {
            const startAtDay = this.helperDateService.create(startAt, {
                dayOf: EnumHelperDateDayOf.start,
            });
            const endAtDay = this.helperDateService.create(endAt, {
                dayOf: EnumHelperDateDayOf.end,
            });
            dateWindow = { startAt: startAtDay, endAt: endAtDay };
        }
        const created = await this.apiKeyRepository.create(
            apiKeyId,
            {
                ...others,
                ...dateWindow,
            },
            key,
            hash
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { apiKey: created, secret };
    }

    async updateStatusByAdmin(id: string, isActive: boolean): Promise<IApiKey> {
        const today = this.helperDateService.create();
        // Sequential by design: gate before the work it guards
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

        const activityLogs = [
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
        this.activityLogDomain.stagePrepared(activityLogs);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return updated;
    }

    async updateByAdmin(id: string, name: string): Promise<IApiKey> {
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const updatedAt = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyUpdate,
                {
                    id: apiKey.id,
                    type: apiKey.type,
                    name,
                },
                updatedAt,
                true
            ),
        ];
        const updated = await this.apiKeyRepository.updateName(id, name);
        this.activityLogDomain.stagePrepared(activityLogs);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return updated;
    }

    async updateDatesByAdmin(
        id: string,
        startAt: Date,
        endAt: Date
    ): Promise<IApiKey> {
        this.validateStartAtIsFuture(startAt);

        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const newStartAt = this.helperDateService.create(startAt, {
            dayOf: EnumHelperDateDayOf.start,
        });
        const newEndAt = this.helperDateService.create(endAt, {
            dayOf: EnumHelperDateDayOf.end,
        });

        const timestamp = this.helperDateService.create();
        const activityLogs = [
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
        this.activityLogDomain.stagePrepared(activityLogs);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return updated;
    }

    async resetByAdmin(id: string): Promise<IApiKeyWithSecret> {
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const secret: string = this.apiKeyCredentialUtil.createSecret();
        const hash: string = this.apiKeyCredentialUtil.createHash(
            apiKey.key,
            secret
        );
        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyReset,
                apiKey,
                timestamp,
                true
            ),
        ];
        const updated = await this.apiKeyRepository.updateHash(id, hash);
        this.activityLogDomain.stagePrepared(activityLogs);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return { apiKey: updated, secret };
    }

    async deleteByAdmin(id: string): Promise<IApiKey> {
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyDelete,
                apiKey,
                timestamp,
                true
            ),
        ];
        const deleted = await this.apiKeyRepository.delete(id);
        this.activityLogDomain.stagePrepared(activityLogs);
        await this.apiKeyCache.deleteCacheByKey(apiKey.key);

        return deleted;
    }

    async getOneActiveByKeyAndCache(key: string): Promise<ApiKey | null> {
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
        const apiKey = await this.getOneActiveByKeyAndCache(key);

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
        if (!apiKey) {
            throw new ApiKeyXApiKeyRequiredException();
        }

        const isTypeAllowed = this.apiKeyUtil.validateType(apiKey, apiKeyTypes);
        if (!isTypeAllowed) {
            throw new ApiKeyXApiKeyForbiddenException();
        }

        return true;
    }
}
