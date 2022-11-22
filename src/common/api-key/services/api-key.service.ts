import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { IApiKeyService } from 'src/common/api-key/interfaces/api-key.service.interface';

import {
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { IApiKey } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/common/api-key/repository/repositories/api-key.repository';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    private readonly env: string;

    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService,
        private readonly helperEncryptionService: HelperEncryptionService
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyEntity[]> {
        return this.apiKeyRepository.findAll<ApiKeyEntity>(find, {
            ...options,
            select: {
                name: 1,
                key: 1,
                isActive: 1,
                createdAt: 1,
            },
        });
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOneById<ApiKeyEntity>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOne<ApiKeyEntity>(find, options);
    }

    async findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOne<ApiKeyEntity>({ key }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.apiKeyRepository.getTotal(find, options);
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity> {
        const update = {
            isActive: false,
        };

        return this.apiKeyRepository.updateOneById(_id, update, options);
    }

    async active(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity> {
        const update = {
            isActive: true,
        };

        return this.apiKeyRepository.updateOneById(_id, update, options);
    }

    async create(
        { name, description }: ApiKeyCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKey> {
        const key = await this.createKey();
        const secret = await this.createSecret();
        const hash: string = await this.createHashApiKey(key, secret);

        const create: ApiKeyEntity = new ApiKeyEntity();
        create.name = name;
        create.description = description;
        create.key = key;
        create.hash = hash;
        create.isActive = true;

        const created = await this.apiKeyRepository.create<ApiKeyEntity>(
            create,
            options
        );

        return {
            _id: created._id,
            secret,
        };
    }

    async createRaw(
        { name, description, key, secret }: ApiKeyCreateRawDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKey> {
        const hash: string = await this.createHashApiKey(key, secret);

        const create: ApiKeyEntity = new ApiKeyEntity();
        create.name = name;
        create.description = description;
        create.key = key;
        create.hash = hash;
        create.isActive = true;

        const created = await this.apiKeyRepository.create<ApiKeyEntity>(
            create,
            options
        );

        return {
            _id: created._id,
            secret,
        };
    }

    async updateOneById(
        _id: string,
        data: ApiKeyUpdateDto,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.updateOneById<ApiKeyUpdateDto>(
            _id,
            data,
            options
        );
    }

    async updateHashById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<IApiKey> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById(
            _id
        );
        const secret: string = await this.createSecret();
        const hash: string = await this.createHashApiKey(apiKey.key, secret);

        const update = {
            hash,
        };

        await this.apiKeyRepository.updateOneById(_id, update, options);

        return {
            _id: apiKey._id,
            secret,
        };
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.deleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.deleteOne(find, options);
    }

    async createKey(): Promise<string> {
        return this.helperStringService.random(25, {
            safe: false,
            upperCase: true,
            prefix: `${this.env}_`,
        });
    }

    async createSecret(): Promise<string> {
        return this.helperStringService.random(35, {
            safe: false,
            upperCase: true,
        });
    }

    async createHashApiKey(key: string, secret: string): Promise<string> {
        return this.helperHashService.sha256(`${key}:${secret}`);
    }

    async validateHashApiKey(
        hashFromRequest: string,
        hash: string
    ): Promise<boolean> {
        return this.helperHashService.sha256Compare(hashFromRequest, hash);
    }
}
