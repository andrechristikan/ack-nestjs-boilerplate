import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
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

@Injectable()
export class SettingDbService implements OnModuleInit
{
    protected cache = new Map<string, any>();
    protected readonly logger = new Logger(SettingDbService.name);

    constructor(protected readonly settingRepository: SettingRepository) {}

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
        this.cache.clear();
        for (const setting of settings) {
            this.cache.set(setting.key, setting.value);
        }
        this.logger.log(
            `Reloaded ${settings.length} feature configs from database`
        );
    }

    async reloadKeysFromDb(keys: string[]): Promise<void> {
        const settings = await this.settingRepository.findAll({
            key: { $in: keys },
        });

        for (const setting of settings) {
            this.cache.set(setting.key, setting.value);
        }

        this.logger.log(
            `Reloaded ${settings.length} feature configs from database`
        );
    }

    async get<T = any>(
        key: string,
        fallback?: T,
        forceReload = false
    ): Promise<T | undefined> {
        if (!forceReload && this.cache.has(key)) {
            return this.cache.get(key) as T;
        }

        const setting = await this.settingRepository.findOne({ key });
        if (setting) {
            this.cache.set(key, setting.value);
            return setting.value as T;
        }

        if (fallback !== undefined) {
            this.cache.set(key, fallback);
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

    findAllCache(): Record<string, any> {
        return Object.fromEntries(this.cache);
    }

    deleteCacheKeys(keys: string[]): void {
        keys.forEach(key => {
            this.cache.delete(key);
            this.logger.log(`Removed key "${key}" from cache`);
        });
    }



    mapList(entities: SettingDoc[] | SettingEntity[]): SettingListResponseDto[] {
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
