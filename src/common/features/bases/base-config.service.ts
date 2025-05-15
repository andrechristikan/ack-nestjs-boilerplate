import { Logger, OnModuleInit } from '@nestjs/common';
import { AppBaseConfigRepositoryBase } from '@common/features/bases/base-config.repository';
import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import { IDatabaseDeleteManyOptions, IDatabaseDocument } from '@common/database/interfaces/database.interface';


export abstract class AppBaseConfigService<
  TEntity extends AppBaseConfigEntityBase = AppBaseConfigEntityBase,
  TDoc extends IDatabaseDocument<TEntity> = IDatabaseDocument<TEntity>,
  TRepo extends AppBaseConfigRepositoryBase<TEntity, TDoc> = AppBaseConfigRepositoryBase<TEntity, TDoc>
> implements OnModuleInit {
  protected cache = new Map<string, any>();
  protected readonly logger = new Logger(AppBaseConfigService.name);

  constructor(
    protected readonly settingRepository: TRepo,
  ) {
  }

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const settings = await this.settingRepository.findAll();
    this.cache.clear();
    for (const setting of settings) {
      this.cache.set(setting.key, setting.value);
    }
    this.logger.log(`Reloaded ${settings.length} settings`);
  }

  async get<T = any>(key: string, fallback?: T, forceReload = false): Promise<T> {
    if (!forceReload && this.cache.has(key)) {
      return this.cache.get(key);
    }

    const setting = await this.settingRepository.findOne({ key });
    if (setting) {
      this.cache.set(key, setting.value);
      return setting.value;
    }

    if (fallback !== undefined) {
      this.cache.set(key, fallback);
    }

    return fallback;
  }

  async set(key: string, value: any): Promise<void> {
    await this.settingRepository.update(
      { key },
      value,
    );
    this.cache.set(key, value);
  }

  async deleteMany(
    find: Record<string, any>,
    options?: IDatabaseDeleteManyOptions,
  ): Promise<boolean> {
    await this.settingRepository.deleteMany(find, options);

    return true;
  }

  async createMany(entries: TEntity[]) {
    try{
      await this.settingRepository.createMany(entries);
    }catch (error) {
      this.logger.error(`Failed to create settings entries: ${error.message}`, error.stack);
    }
  }

  keys(): string[] {
    return [...this.cache.keys()];
  }

  all(): Record<string, any> {
    return Object.fromEntries(this.cache);
  }
}
