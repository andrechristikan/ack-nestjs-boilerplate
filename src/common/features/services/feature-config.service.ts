import { Injectable, Logger } from '@nestjs/common';
import { AppBaseConfigService } from '@common/features/bases/base-config.service';
import { FeatureConfigDoc, FeatureConfigEntity } from '@common/features/repository/entities/feature-config.entity';
import { IDatabaseFindAllOptions } from '@common/database/interfaces/database.interface';
import { FeatureConfigRepository } from '@common/features/repository/repositories/feature-config-repository.service';

@Injectable()
export class FeatureConfigService extends AppBaseConfigService<FeatureConfigEntity, FeatureConfigDoc, FeatureConfigRepository> {
  protected readonly logger = new Logger(FeatureConfigService.name);

  constructor(
    protected readonly settingRepository: FeatureConfigRepository,
  ) {
    super(settingRepository);
  }

  async isEnabled(key: string, fallback = false, forceReload = false): Promise<boolean> {
    //WARNING: We are FORCING everytime to read from the database and skipping the cache.
    // This is mainly because the enable/disable flag is very important and we want to detect immediately if
    // the value is changed in the database.
    return await this.get<boolean>(key, fallback,forceReload) === true;
  }

  async findAll(find?: Record<string, any>, options?: IDatabaseFindAllOptions): Promise<FeatureConfigDoc[]> {
    return this.settingRepository.findAll(find, options);
  }


}