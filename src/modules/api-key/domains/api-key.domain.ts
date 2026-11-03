import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyStartAtNotFutureException } from '@modules/api-key/exceptions/api-key.start-at-not-future.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
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
        private readonly apiKeyRepository: ApiKeyRepository
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

    async createByAdmin(
        apiKeyId: string,
        { startAt, endAt, ...others }: IApiKeyCreate
    ): Promise<IApiKeyWithSecret> {
        if (startAt) {
            this.validateStartAtIsFuture(startAt);
        }

        const { key, secret, hash } =
            this.apiKeyCredentialUtil.generateCredential();
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

        return { apiKey: created, secret };
    }

    async updateStatusByAdmin(id: string, isActive: boolean): Promise<IApiKey> {
        const today = this.helperDateService.create();
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const isExpired = this.apiKeyUtil.isExpired(apiKey.endAt, today);
        if (isExpired) {
            throw new ApiKeyExpiredException();
        }

        const updated = await this.apiKeyRepository.updateStatus(id, {
            isActive,
        });
        await this.apiKeyCache.deleteApiKey(apiKey.key);

        return updated;
    }

    async updateByAdmin(id: string, name: string): Promise<IApiKey> {
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        this.validateApiKey(apiKey, true);

        const updated = await this.apiKeyRepository.updateName(id, name);
        await this.apiKeyCache.deleteApiKey(apiKey.key);

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

        const updated = await this.apiKeyRepository.updateDates(id, {
            startAt: newStartAt,
            endAt: newEndAt,
        });
        await this.apiKeyCache.deleteApiKey(apiKey.key);

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
        const updated = await this.apiKeyRepository.updateHash(id, hash);
        await this.apiKeyCache.deleteApiKey(apiKey.key);

        return { apiKey: updated, secret };
    }

    async deleteByAdmin(id: string): Promise<IApiKey> {
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneById(id);
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const deleted = await this.apiKeyRepository.delete(id);
        await this.apiKeyCache.deleteApiKey(apiKey.key);

        return deleted;
    }

    async validateXApiKey(xApiKeyHeader: string | null): Promise<ApiKey> {
        const xApiKeyTrimmed = xApiKeyHeader?.trim();
        if (!xApiKeyTrimmed) {
            throw new ApiKeyXApiKeyRequiredException();
        }

        const header = this.apiKeyCredentialUtil.parseHeader(xApiKeyTrimmed);
        if (!header) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const { key, secret } = header;
        const today = this.helperDateService.create();
        const cached = await this.apiKeyCache.getApiKey(key);
        let apiKey = cached;
        let leaseToken: string | null = null;
        if (!apiKey) {
            // Sequential by design: the lease is taken before the read it guards
            leaseToken = await this.apiKeyCache.takeApiKeyLease(key);
            const found = await this.apiKeyRepository.findOneByKey(key);
            apiKey = found;
        }

        if (!apiKey) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const isCredentialValid = this.apiKeyCredentialUtil.validateCredential(
            key,
            secret,
            apiKey
        );
        const isNotYetActive = this.apiKeyUtil.isNotYetActive(
            apiKey.startAt,
            today
        );
        const isActive = this.apiKeyUtil.isActive(apiKey);
        if (!isCredentialValid || !isActive || isNotYetActive) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const isExpired = this.apiKeyUtil.isExpired(apiKey.endAt, today);
        if (isExpired) {
            throw new ApiKeyExpiredException();
        }

        if (leaseToken !== null) {
            await this.apiKeyCache.setApiKey(apiKey, leaseToken);
        }

        return apiKey;
    }

    validateXApiKeyTypeGuard(
        apiKey: ApiKey,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean {
        const isTypeAllowed = this.apiKeyUtil.validateType(apiKey, apiKeyTypes);
        if (!isTypeAllowed) {
            throw new ApiKeyXApiKeyForbiddenException();
        }

        return true;
    }
}
