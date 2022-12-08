import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { IApiKeyService } from 'src/common/api-key/interfaces/api-key.service.interface';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/common/api-key/repository/repositories/api-key.repository';
import { ApiKeyActiveDto } from 'src/common/api-key/dtos/api-key.active.dto';
import { ApiKeyResetDto } from 'src/common/api-key/dtos/api-key.reset.dto';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

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

    async updateIsActive(
        _id: string,
        data: ApiKeyActiveDto,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.updateOneById<ApiKeyActiveDto>(
            _id,
            data,
            options
        );
    }

    async create(
        data: IApiKeyEntity,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyEntity> {
        const created = await this.apiKeyRepository.create<IApiKeyEntity>(
            data,
            options
        );

        return created;
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
        data: ApiKeyResetDto,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.updateOneById<ApiKeyResetDto>(
            _id,
            data,
            options
        );
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
}
