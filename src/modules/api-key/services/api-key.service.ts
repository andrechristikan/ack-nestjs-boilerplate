import { CacheService } from '@common/cache/services/cache.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey, Prisma } from '@generated/prisma-client/client';
import { ApiKeyCacheSchema } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyEndAtNotFutureException } from '@modules/api-key/exceptions/api-key.end-at-not-future.exception';
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
    IApiKeyGenerateCredential,
    IApiKeyHeader,
    IApiKeyWithSecret,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyService {
    private readonly secretLength: number;

    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly apiKeyCredentialUtil: ApiKeyCredentialUtil,
        private readonly apiKeyCache: ApiKeyCache,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly cacheService: CacheService,
        private readonly outboxService: OutboxService,
        private readonly configService: ConfigService
    ) {
        this.secretLength = this.configService.get<number>(
            'auth.xApiKey.secretLength'
        )!;
    }

    private isActive(apiKey: IApiKey): boolean {
        return apiKey.isActive;
    }

    private isExpired(endAt: Date | null, currentDate: Date): boolean {
        return endAt !== null && currentDate > endAt;
    }

    private isNotYetActive(startAt: Date | null, currentDate: Date): boolean {
        return startAt !== null && currentDate < startAt;
    }

    private validateType(
        apiKey: { type: EnumApiKeyType },
        allowed: EnumApiKeyType[]
    ): boolean {
        return allowed.includes(apiKey.type);
    }

    private createSecret(): string {
        return this.helperStringService.random(this.secretLength);
    }

    private generateCredential(): IApiKeyGenerateCredential {
        const key = this.apiKeyCredentialUtil.createKey(null);
        const secret = this.createSecret();
        const hash: string = this.apiKeyCredentialUtil.createHash(key, secret);

        return { key, secret, hash };
    }

    private parseHeader(header: string): IApiKeyHeader | null {
        const [key, secret, ...rest] = header.split(':');
        if (
            key === undefined ||
            secret === undefined ||
            rest.length > 0 ||
            key.trim() === '' ||
            secret.trim() === ''
        ) {
            return null;
        }

        return { key, secret };
    }

    private validateCredential(
        key: string,
        secret: string,
        apiKey: { hash: string }
    ): boolean {
        const expectedHash = this.apiKeyCredentialUtil.createHash(key, secret);
        return this.helperHashService.sha256Compare(expectedHash, apiKey.hash);
    }

    private getValidApiKey(
        apiKey: IApiKey | null,
        includeActive: boolean = false
    ): IApiKey {
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        if (includeActive) {
            const isActive = this.isActive(apiKey);
            if (!isActive) {
                throw new ApiKeyInactiveException();
            }
        }

        return apiKey;
    }

    private validateStartAtIsFuture(startAt: Date): void {
        const now = this.helperDateService.create();
        if (startAt <= now) {
            throw new ApiKeyStartAtNotFutureException();
        }

        return;
    }

    private async addInvalidateEffectInTx(
        tx: IDatabaseTransactionClient,
        key: string
    ): Promise<void> {
        const keys = this.apiKeyCache.buildApiKeyKeys(key);
        const effect = this.cacheService.invalidateEffect(keys);
        await this.outboxService.addInTx(tx, effect);
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams,
        isActive: Record<string, IPaginationEqual> | null,
        type: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        return this.apiKeyRepository.findWithPagination(
            pagination,
            isActive,
            type,
            additionalWhere
        );
    }

    async createByAdminInTx(
        tx: IDatabaseTransactionClient,
        apiKeyId: string,
        { startAt, endAt, ...others }: IApiKeyCreate
    ): Promise<IApiKeyWithSecret> {
        if (startAt) {
            this.validateStartAtIsFuture(startAt);
        }

        const { key, secret, hash } = this.generateCredential();
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
        const created = await this.apiKeyRepository.createInTx(
            tx,
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

    async updateStatusByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        isActive: boolean,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IApiKey> {
        const today = this.helperDateService.create();
        const apiKey = await this.apiKeyRepository.findOneByIdInTx(
            tx,
            id,
            additionalWhere
        );
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const isExpired = this.isExpired(apiKey.endAt, today);
        if (isExpired) {
            throw new ApiKeyExpiredException();
        }

        const updated = await this.apiKeyRepository.updateStatusInTx(
            tx,
            id,
            apiKey.isActive,
            isActive
        );
        if (!updated) {
            throw new ApiKeyNotFoundException();
        }

        await this.addInvalidateEffectInTx(tx, apiKey.key);

        return updated;
    }

    async updateByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        name: string,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IApiKey> {
        // Sequential by design: gate before the work it guards
        const found = await this.apiKeyRepository.findOneByIdInTx(
            tx,
            id,
            additionalWhere
        );
        const apiKey = this.getValidApiKey(found, true);

        const updated = await this.apiKeyRepository.updateNameInTx(
            tx,
            id,
            name
        );
        await this.addInvalidateEffectInTx(tx, apiKey.key);

        return updated;
    }

    async updateDatesByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        startAt: Date | null,
        endAt: Date | null,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IApiKey> {
        let newStartAt: Date | null = null;
        let newEndAt: Date | null = null;
        if (startAt !== null && endAt !== null) {
            newStartAt = this.helperDateService.create(startAt, {
                dayOf: EnumHelperDateDayOf.start,
            });
            newEndAt = this.helperDateService.create(endAt, {
                dayOf: EnumHelperDateDayOf.end,
            });
            const now = this.helperDateService.create();
            if (newEndAt <= now) {
                throw new ApiKeyEndAtNotFutureException();
            }
        }

        // Sequential by design: gate before the work it guards
        const found = await this.apiKeyRepository.findOneByIdInTx(
            tx,
            id,
            additionalWhere
        );
        const apiKey = this.getValidApiKey(found, true);

        const updated = await this.apiKeyRepository.updateDatesInTx(
            tx,
            id,
            newStartAt,
            newEndAt
        );
        if (!updated) {
            throw new ApiKeyInactiveException();
        }

        await this.addInvalidateEffectInTx(tx, apiKey.key);

        return updated;
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IApiKeyWithSecret> {
        const found = await this.apiKeyRepository.findOneByIdInTx(
            tx,
            id,
            additionalWhere
        );
        const apiKey = this.getValidApiKey(found, true);

        const secret: string = this.createSecret();
        const hash: string = this.apiKeyCredentialUtil.createHash(
            apiKey.key,
            secret
        );
        const updated = await this.apiKeyRepository.updateHashInTx(
            tx,
            id,
            hash
        );
        if (!updated) {
            throw new ApiKeyInactiveException();
        }

        await this.addInvalidateEffectInTx(tx, apiKey.key);

        return { apiKey: updated, secret };
    }

    async deleteByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.ApiKeyWhereInput | null
    ): Promise<IApiKey> {
        // Sequential by design: gate before the work it guards
        const apiKey = await this.apiKeyRepository.findOneByIdInTx(
            tx,
            id,
            additionalWhere
        );
        if (!apiKey) {
            throw new ApiKeyNotFoundException();
        }

        const deleted = await this.apiKeyRepository.deleteInTx(tx, id);
        if (!deleted) {
            throw new ApiKeyNotFoundException();
        }

        await this.addInvalidateEffectInTx(tx, apiKey.key);

        return apiKey;
    }

    async validateXApiKey(xApiKeyHeader: string | null): Promise<ApiKey> {
        const xApiKeyTrimmed = xApiKeyHeader?.trim();
        if (!xApiKeyTrimmed) {
            throw new ApiKeyXApiKeyRequiredException();
        }

        const header = this.parseHeader(xApiKeyTrimmed);
        if (!header) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const { key, secret } = header;
        const today = this.helperDateService.create();
        const cacheKey = this.apiKeyCache.buildApiKeyKey(key);
        const lease = this.apiKeyCache.buildApiKeyLease(key);
        const apiKey = await this.cacheService.readThrough(
            cacheKey,
            ApiKeyCacheSchema,
            this.apiKeyCache.cacheTtlInMs,
            () => this.apiKeyRepository.findOneByKey(key),
            { lease }
        );
        if (!apiKey) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const isCredentialValid = this.validateCredential(key, secret, apiKey);
        const isNotYetActive = this.isNotYetActive(apiKey.startAt, today);
        const isActive = this.isActive(apiKey);
        if (!isCredentialValid || !isActive || isNotYetActive) {
            throw new ApiKeyXApiKeyInvalidException();
        }

        const isExpired = this.isExpired(apiKey.endAt, today);
        if (isExpired) {
            throw new ApiKeyExpiredException();
        }

        return apiKey;
    }

    validateXApiKeyTypeGuard(
        apiKey: ApiKey,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean {
        const isTypeAllowed = this.validateType(apiKey, apiKeyTypes);
        if (!isTypeAllowed) {
            throw new ApiKeyXApiKeyForbiddenException();
        }

        return true;
    }
}
