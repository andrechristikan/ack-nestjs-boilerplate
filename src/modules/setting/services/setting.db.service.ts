import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
} from '@common/database/interfaces/database.interface';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import {
    SettingDoc,
    SettingEntity,
} from '@modules/setting/repository/entities/setting.entity';
import { SettingRepository } from '@modules/setting/repository/repositories/setting.repository';
import { SettingListResponseDto } from '@modules/setting/dtos/response/setting.list.response.dto';
import { SettingGetResponseDto } from '@modules/setting/dtos/response/setting.get.response.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class SettingDbService<T = any> implements OnModuleInit {
    protected readonly logger = new Logger(SettingDbService.name);
    private readonly CACHE_PREFIX = 'setting:';

    constructor(
        protected readonly settingRepository: SettingRepository<T>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) {}

    async isEnabled(
        key: string,
        fallback = false,
        forceReload = false
    ): Promise<boolean> {
        return this.get<boolean>(key, fallback, forceReload);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingEntity[]> {
        return this.settingRepository.findAll(find, options);
    }

    async onModuleInit(): Promise<void> {
        await this.reloadAllKeysFromDb();
    }

    async reloadAllKeysFromDb(): Promise<void> {
        const settings = await this.settingRepository.findAll();

        const settingsKey = settings.map(setting => setting.key);

        await this.reloadKeysFromDb(settingsKey);

        this.logger.log(`Reloaded ${settings.length} settings from database`);
    }

    async reloadKeysFromDb(keys: string[]): Promise<void> {
        const settings = await this.settingRepository.findAll({
            key: { $in: keys },
        });

        const cacheKeys = settings.map(
            setting => `${this.CACHE_PREFIX}${setting.key}`
        );
        const deletionBatch = await this.cacheManager.mdel(cacheKeys);
        if (!deletionBatch) {
            this.logger.error('Cleanup of cacheManager failed');
        }

        for (const setting of settings) {
            await this.cacheManager.set(
                `${this.CACHE_PREFIX}${setting.key}`,
                setting.value
            );
        }
    }

    async get<T = any>(
        key: string,
        fallback?: T,
        forceReload = false
    ): Promise<T | undefined> {
        const cacheKey = `${this.CACHE_PREFIX}${key}`;

        if (!forceReload) {
            const cachedValue = await this.cacheManager.get<T>(cacheKey);
            if (cachedValue !== undefined) {
                return cachedValue;
            }
        }

        const setting = await this.settingRepository.findOne({ key });
        if (setting) {
            await this.cacheManager.set(cacheKey, setting.value);
            return setting.value;
        }

        if (fallback !== undefined) {
            await this.cacheManager.set(cacheKey, fallback);
        }

        return fallback;
    }

    async set(key: string, value: any): Promise<void> {
        await this.settingRepository.update({ key }, value);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.settingRepository.deleteMany(find, options);

        return true;
    }

    async createMany(entries: SettingEntity[]) {
        try {
            await this.settingRepository.createMany(entries);
        } catch (error) {
            this.logger.error(
                `Failed to create settings entries: ${error.message}`,
                error.stack
            );
        }
    }

    async create(entry: SettingEntity): Promise<SettingEntity | null> {
        try {
            const createdEntry = await this.settingRepository.create(entry);
            return createdEntry;
        } catch (error) {
            this.logger.error(
                `Failed to create entry: ${error.message}`,
                error.stack
            );
            return null;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const deletedEntry = await this.settingRepository.delete({ key });
            return !!deletedEntry;
        } catch (error) {
            this.logger.error(
                `Failed to delete entry with key "${key}": ${error.message}`,
                error.stack
            );
            return false;
        }
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    mapList(
        entities: SettingDoc[] | SettingEntity[]
    ): SettingListResponseDto[] {
        return plainToInstance(
            SettingListResponseDto,
            entities.map((e: SettingDoc | SettingEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    mapGet(entity: SettingDoc | SettingEntity): SettingGetResponseDto {
        return plainToInstance(
            SettingGetResponseDto,
            entity instanceof Document ? entity.toObject() : entity
        );
    }
}
