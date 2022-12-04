import { Injectable } from '@nestjs/common';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
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
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/common/api-key/repository/repositories/api-key.repository';
import { ApiKeyUseCase } from 'src/common/api-key/use-cases/api-key.use-case';
import { ApiKeyActiveDto } from 'src/common/api-key/dtos/api-key.active.dto';
import { ApiKeyResetDto } from 'src/common/api-key/dtos/api-key.reset.dto';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly helperHashService: HelperHashService,
        private readonly apiKeyUseCase: ApiKeyUseCase
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyEntity[]> {
        return this.apiKeyRepository.findAll<ApiKeyEntity>(find, options);
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

    async findOneByKeyAndActive(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOne<ApiKeyEntity>(
            { key, isActive: true },
            options
        );
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
        const update: ApiKeyActiveDto = await this.apiKeyUseCase.inactive();
        return this.apiKeyRepository.updateOneById<ApiKeyActiveDto>(
            _id,
            update,
            options
        );
    }

    async active(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity> {
        const update: ApiKeyActiveDto = await this.apiKeyUseCase.active();
        return this.apiKeyRepository.updateOneById<ApiKeyActiveDto>(
            _id,
            update,
            options
        );
    }

    async create(
        data: ApiKeyCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKeyEntity> {
        const create: IApiKeyEntity = await this.apiKeyUseCase.create(data);
        const created = await this.apiKeyRepository.create<IApiKeyEntity>(
            create,
            options
        );

        return {
            ...created,
            secret: create.secret,
        };
    }

    async createRaw(
        data: ApiKeyCreateRawDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKeyEntity> {
        const create: IApiKeyEntity = await this.apiKeyUseCase.createRaw(data);
        const created = await this.apiKeyRepository.create<IApiKeyEntity>(
            create,
            options
        );

        return {
            ...created,
            secret: create.secret,
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

    async updateResetById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<IApiKeyEntity> {
        const apiKey: ApiKeyEntity = await this.apiKeyRepository.findOneById(
            _id
        );
        const update: ApiKeyResetDto = await this.apiKeyUseCase.reset(apiKey);
        const updated = await this.apiKeyRepository.updateOneById(
            _id,
            update,
            options
        );

        return {
            ...updated,
            secret: update.secret,
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

    async validateHashApiKey(
        hashFromRequest: string,
        hash: string
    ): Promise<boolean> {
        return this.helperHashService.sha256Compare(hashFromRequest, hash);
    }
}
