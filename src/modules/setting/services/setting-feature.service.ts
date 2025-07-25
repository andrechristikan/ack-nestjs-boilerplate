import { Inject, Injectable } from '@nestjs/common';
import {
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SettingFeatureRepository } from '@modules/setting/repository/repositories/setting-feature.repository';
import { ConfigService } from '@nestjs/config';
import { SettingJson } from '@modules/setting/interfaces/setting.interface';
import { ISettingFeatureService } from '@modules/setting/interfaces/setting-feature.service.interface';
import {
    SettingFeatureDoc,
    SettingFeatureEntity,
} from '@modules/setting/repository/entities/setting-feature.entity';
import { SettingFeatureListResponseDto } from '@modules/setting/dtos/response/setting-feature.list.response.dto';
import { SettingFeatureGetResponseDto } from '@modules/setting/dtos/response/setting-feature.get.response.dto';
import { SettingFeatureUpdateRequestDto } from '@modules/setting/dtos/request/setting-feature.update.request.dto';

@Injectable()
export class SettingFeatureService implements ISettingFeatureService {
    private readonly keyPrefix: string;

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly settingFeatureRepository: SettingFeatureRepository,
        private readonly configService: ConfigService
    ) {
        this.keyPrefix = this.configService.get<string>('setting.keyPrefix');
    }

    private serializeValue(value: SettingJson): string {
        return JSON.stringify(value);
    }

    private deserializeValue(value: string): SettingJson {
        return JSON.parse(value);
    }

    async flush(): Promise<void> {
        const settings = await this.settingFeatureRepository.findAll();
        const cacheKeys = settings.map(
            setting => `${this.keyPrefix}:${setting.key}`
        );

        await this.cacheManager.mdel(cacheKeys);
    }

    async getAndCache(key: string): Promise<SettingJson> {
        const cacheKey = `${this.keyPrefix}:${key}`;
        const cachedValue = await this.cacheManager.get<string>(cacheKey);

        if (cachedValue) {
            return this.deserializeValue(cachedValue);
        }

        const setting = await this.settingFeatureRepository.findOne({
            key: key,
        });

        if (!setting) {
            return null;
        }

        const valueToCache = this.serializeValue(setting.value);
        await this.cacheManager.set(cacheKey, valueToCache);
        return setting.value;
    }

    async deleteCache(key: string): Promise<void> {
        const cacheKey = `${this.keyPrefix}:${key}`;
        await this.cacheManager.del(cacheKey);
        return;
    }

    async update(
        repository: SettingFeatureDoc,
        dto: SettingFeatureUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingFeatureDoc> {
        repository.value = dto.value;
        repository.description = dto.description;
        return this.settingFeatureRepository.save(repository, options);
    }

    async findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingFeatureDoc> {
        return this.settingFeatureRepository.findOne({ key: key }, options);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingFeatureDoc[]> {
        return this.settingFeatureRepository.findAll(find, options);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<void> {
        await this.settingFeatureRepository.deleteMany(find, options);

        return;
    }

    async createMany(entries: SettingFeatureEntity[]): Promise<void> {
        await this.settingFeatureRepository.createMany(entries);
    }

    async delete(key: string): Promise<SettingFeatureDoc> {
        return this.settingFeatureRepository.delete({
            key,
        });
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.settingFeatureRepository.getTotal(find, options);
    }

    mapList(
        entities: SettingFeatureDoc[] | SettingFeatureEntity[]
    ): SettingFeatureListResponseDto[] {
        return plainToInstance(
            SettingFeatureListResponseDto,
            entities.map((e: SettingFeatureDoc | SettingFeatureEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    mapGet(
        entity: SettingFeatureDoc | SettingFeatureEntity
    ): SettingFeatureGetResponseDto {
        return plainToInstance(
            SettingFeatureGetResponseDto,
            entity instanceof Document ? entity.toObject() : entity
        );
    }
}
