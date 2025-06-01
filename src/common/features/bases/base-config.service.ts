import { Logger, OnModuleInit } from '@nestjs/common';
import { AppBaseConfigRepositoryBase } from '@common/features/bases/base-config.repository';
import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import {
    IDatabaseDeleteManyOptions,
    IDatabaseDocument,
} from '@common/database/interfaces/database.interface';

export abstract class AppBaseConfigService<
    TValue = any,
    TEntity extends AppBaseConfigEntityBase = AppBaseConfigEntityBase<TValue>,
    TDoc extends IDatabaseDocument<TEntity> = IDatabaseDocument<TEntity>,
    TRepo extends AppBaseConfigRepositoryBase<
        TEntity,
        TDoc
    > = AppBaseConfigRepositoryBase<TEntity, TDoc>,
> implements OnModuleInit
{
    protected cache = new Map<string, any>();
    protected readonly logger = new Logger(AppBaseConfigService.name);

    constructor(protected readonly settingRepository: TRepo) {}

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

    async get<T = TValue>(
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

    async createMany(entries: TEntity[]) {
        try {
            await this.settingRepository.createMany(entries);
        } catch (error) {
            this.logger.error(
                `Failed to create settings entries: ${error.message}`,
                error.stack
            );
        }
    }

    async create(entry: TEntity): Promise<TEntity | null> {
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
}
