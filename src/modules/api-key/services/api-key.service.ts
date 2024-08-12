import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import {
    ApiKeyCreateRawRequestDto,
    ApiKeyCreateRequestDto,
} from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from 'src/modules/api-key/dtos/response/api-key.create.dto';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/modules/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from 'src/modules/api-key/dtos/response/api-key.reset.dto';
import { IApiKeyService } from 'src/modules/api-key/interfaces/api-key.service.interface';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/modules/api-key/repository/repositories/api-key.repository';
import { Document } from 'mongoose';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    private readonly env: string;

    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly apiKeyRepository: ApiKeyRepository
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyDoc[]> {
        return this.apiKeyRepository.findAll(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOneById(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOne(find, options);
    }

    async findOneByKey(
        key: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOne<ApiKeyDoc>({ key }, options);
    }

    async findOneByActiveKey(
        key: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.findOne<ApiKeyDoc>(
            {
                key,
                isActive: true,
            },
            options
        );
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

        const dto: ApiKeyEntity = new ApiKeyEntity();
        dto.name = name;
        dto.key = key;
        dto.hash = hash;
        dto.isActive = true;
        dto.type = type;

        if (startDate && endDate) {
            dto.startDate = this.helperDateService.startOfDay(startDate);
            dto.endDate = this.helperDateService.endOfDay(endDate);
        }

        const created: ApiKeyDoc =
            await this.apiKeyRepository.create<ApiKeyEntity>(dto, options);

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

        const dto: ApiKeyEntity = new ApiKeyEntity();
        dto.name = name;
        dto.key = key;
        dto.hash = hash;
        dto.isActive = true;
        dto.type = type;

        if (startDate && endDate) {
            dto.startDate = this.helperDateService.startOfDay(startDate);
            dto.endDate = this.helperDateService.endOfDay(endDate);
        }

        const created: ApiKeyDoc =
            await this.apiKeyRepository.create<ApiKeyEntity>(dto, options);

        return { _id: created._id, key: created.key, secret };
    }

    async active(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.isActive = true;

        return this.apiKeyRepository.save(repository, options);
    }

    async inactive(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.isActive = false;

        return this.apiKeyRepository.save(repository, options);
    }

    async update(
        repository: ApiKeyDoc,
        { name }: ApiKeyUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.name = name;

        return this.apiKeyRepository.save(repository, options);
    }

    async updateDate(
        repository: ApiKeyDoc,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        repository.startDate = this.helperDateService.startOfDay(startDate);
        repository.endDate = this.helperDateService.endOfDay(endDate);

        return this.apiKeyRepository.save(repository, options);
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

        const updated = await this.apiKeyRepository.save(repository, options);

        return { _id: updated._id, key: updated.key, secret };
    }

    async delete(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc> {
        return this.apiKeyRepository.softDelete(repository, null, options);
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
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        try {
            await this.apiKeyRepository.deleteMany(find, options);

            return true;
        } catch (error: unknown) {
            throw error;
        }
    }

    async inactiveManyByEndDate(
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean> {
        try {
            await this.apiKeyRepository.updateMany(
                {
                    endDate: {
                        $lte: this.helperDateService.create(),
                    },
                    isActive: true,
                },
                {
                    isActive: false,
                },
                options
            );

            return true;
        } catch (error: unknown) {
            throw error;
        }
    }

    async mapList(
        apiKeys: ApiKeyDoc[] | ApiKeyEntity[]
    ): Promise<ApiKeyListResponseDto[]> {
        return plainToInstance(
            ApiKeyListResponseDto,
            apiKeys.map((e: ApiKeyDoc | ApiKeyEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    async mapGet(
        apiKey: ApiKeyDoc | ApiKeyEntity
    ): Promise<ApiKeyGetResponseDto> {
        return plainToInstance(
            ApiKeyGetResponseDto,
            apiKey instanceof Document ? apiKey.toObject() : apiKey
        );
    }
}
