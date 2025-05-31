import { Injectable, Logger } from '@nestjs/common';
import { AppBaseConfigService } from '@common/features/bases/base-config.service';
import {
    FeatureConfigBaseValue,
    FeatureConfigDoc,
    FeatureConfigEntity,
} from '@common/features/repository/entities/feature-config.entity';
import { IDatabaseFindAllOptions } from '@common/database/interfaces/database.interface';
import { FeatureConfigRepository } from '@common/features/repository/repositories/feature-config-repository.service';

@Injectable()
export class FeatureConfigService extends AppBaseConfigService<
    FeatureConfigBaseValue,
    FeatureConfigEntity,
    FeatureConfigDoc,
    FeatureConfigRepository
> {
    protected readonly logger = new Logger(FeatureConfigService.name);

    constructor(protected readonly settingRepository: FeatureConfigRepository) {
        super(settingRepository);
    }

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
    ): Promise<FeatureConfigDoc[]> {
        return this.settingRepository.findAll(find, options);
    }
}
