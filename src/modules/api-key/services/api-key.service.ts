import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    ApiKeyCreateRawRequestDto,
    ApiKeyCreateRequestDto,
} from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyGetResponseDto } from '@modules/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from '@modules/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from '@modules/api-key/dtos/response/api-key.reset.response.dto';
import { IApiKeyService } from '@modules/api-key/interfaces/api-key.service.interface';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from '@modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from '@modules/api-key/repository/repositories/api-key.repository';
import { Document } from 'mongoose';
import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    private readonly env: string;

    private readonly keyPrefix: string;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly databaseService: DatabaseService
    ) {
        this.env = this.configService.get<string>('app.env');

        this.keyPrefix = this.configService.get<string>(
            'auth.xApiKey.keyPrefix'
        )!;
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyDoc[]> {
        return this.apiKeyRepository.findAll(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOneById(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOne(find, options);
    }

    async findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOne<ApiKeyDoc>({ key }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.apiKeyRepository.getTotal(find, options);
    }

    async create(
        { name, type, startDate, endDate }: ApiKeyCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto> {
        const key = await this.createKey();
        const secret = await this.createSecret();
        const hash: string = await this.createHashApiKey(key, secret);

        const data: ApiKeyEntity = new ApiKeyEntity();
        data.name = name;
        data.key = key;
        data.hash = hash;
        data.isActive = true;
        data.type = type;

        if (startDate && endDate) {
            data.startDate = this.helperDateService.create(startDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.START,
            });
            data.endDate = this.helperDateService.create(endDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.END,
            });
        }

        const created: ApiKeyDoc =
            await this.apiKeyRepository.create<ApiKeyEntity>(data, options);

        return { _id: created._id, key: created.key, secret };
    }

    async createRaw(
        {
            name,
            key,
            type,
            secret,
            startDate,
            endDate,
        }: ApiKeyCreateRawRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto> {
        const hash: string = await this.createHashApiKey(key, secret);

        const data: ApiKeyEntity = new ApiKeyEntity();
        data.name = name;
        data.key = key;
        data.hash = hash;
        data.isActive = true;
        data.type = type;

        if (startDate && endDate) {
            data.startDate = this.helperDateService.create(startDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.START,
            });
            data.endDate = this.helperDateService.create(endDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.END,
            });
        }

        const created: ApiKeyDoc =
            await this.apiKeyRepository.create<ApiKeyEntity>(data, options);

        return { _id: created._id, key: created.key, secret };
    }

    async active(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.isActive = true;

        const [updated] = await Promise.all([
            this.apiKeyRepository.save(repository, options),
            this.deleteCache(repository._id),
        ]);

        return updated;
    }

    async inactive(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.isActive = false;

        const [updated] = await Promise.all([
            this.apiKeyRepository.save(repository, options),
            this.deleteCache(repository._id),
        ]);

        return updated;
    }

    async update(
        repository: ApiKeyDoc,
        { name }: ApiKeyUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.name = name;

        const [updated] = await Promise.all([
            this.apiKeyRepository.save(repository, options),
            this.deleteCache(repository._id),
        ]);

        return updated;
    }

    async updateDate(
        repository: ApiKeyDoc,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.startDate = this.helperDateService.create(startDate, {
            dayOf: ENUM_HELPER_DATE_DAY_OF.START,
        });
        repository.endDate = this.helperDateService.create(endDate, {
            dayOf: ENUM_HELPER_DATE_DAY_OF.END,
        });

        const [updated] = await Promise.all([
            this.apiKeyRepository.save(repository, options),
            this.deleteCache(repository._id),
        ]);

        return updated;
    }

    async reset(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyResetResponseDto> {
        const secret: string = await this.createSecret();
        const hash: string = await this.createHashApiKey(
            repository.key,
            secret
        );

        repository.hash = hash;

        const [updated] = await Promise.all([
            this.apiKeyRepository.save(repository, options),
            this.deleteCache(repository._id),
        ]);

        return { _id: updated._id, key: updated.key, secret };
    }

    async delete(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        const [deleted] = await Promise.all([
            this.apiKeyRepository.softDelete(repository, options),
            this.deleteCache(repository._id),
        ]);

        return deleted;
    }

    async validateHashApiKey(
        hashFromRequest: string,
        hash: string
    ): Promise<boolean> {
        return this.helperHashService.sha256Compare(hashFromRequest, hash);
    }

    async createKey(): Promise<string> {
        const random: string = this.helperStringService.random(25);
        return `${this.env}_${random}`;
    }

    async createSecret(): Promise<string> {
        return this.helperStringService.random(35);
    }

    async createHashApiKey(key: string, secret: string): Promise<string> {
        return this.helperHashService.sha256(`${key}:${secret}`);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.apiKeyRepository.deleteMany(find, options);

        return true;
    }

    mapList(apiKeys: ApiKeyDoc[] | ApiKeyEntity[]): ApiKeyListResponseDto[] {
        return plainToInstance(
            ApiKeyListResponseDto,
            apiKeys.map((e: ApiKeyDoc | ApiKeyEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    mapGet(apiKey: ApiKeyDoc | ApiKeyEntity): ApiKeyGetResponseDto {
        return plainToInstance(
            ApiKeyGetResponseDto,
            apiKey instanceof Document ? apiKey.toObject() : apiKey
        );
    }

    async findOneByKeyAndCache(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        const cached = await this.getCache(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.findOneByKey(key, options);
        const apiKeyEntity = apiKey.toObject() as ApiKeyEntity;
        if (apiKey) {
            await this.setCache(apiKey._id, apiKeyEntity);
        }

        return apiKeyEntity;
    }

    async getCache(_id: string): Promise<ApiKeyEntity | null> {
        const cacheKey = `${this.keyPrefix}:${_id}`;
        const cachedApiKey = await this.cacheManager.get<string>(cacheKey);
        if (cachedApiKey) {
            return JSON.parse(cachedApiKey) as ApiKeyEntity;
        }

        return null;
    }

    async setCache(_id: string, apiKey: ApiKeyEntity): Promise<void> {
        const cacheKey = `${this.keyPrefix}:${_id}`;
        await this.cacheManager.set(cacheKey, JSON.stringify(apiKey));
        return;
    }

    async deleteCache(_id: string): Promise<void> {
        const cacheKey = `${this.keyPrefix}:${_id}`;
        await this.cacheManager.del(cacheKey);
        return;
    }
}
