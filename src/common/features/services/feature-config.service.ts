import { Injectable, Logger } from '@nestjs/common';
import { AppBaseConfigService } from '@common/features/bases/base-config.service';
import {
    FeatureConfigBaseValue,
    FeatureConfigDoc,
    FeatureConfigEntity,
} from '@common/features/repository/entities/feature-config.entity';
import { IDatabaseFindAllOptions } from '@common/database/interfaces/database.interface';
import { FeatureConfigRepository } from '@common/features/repository/repositories/feature-config-repository.service';
import { FeatureConfigGetResponseDto } from '@common/features/dtos/response/feature-config.get.response.dto';
import { plainToInstance } from 'class-transformer';
import { FeatureConfigListResponseDto } from '@common/features/dtos/response/feature-config.list.response.dto';
import { Document } from 'mongoose';

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

    mapList(
        entities: FeatureConfigDoc[] | FeatureConfigEntity[]
    ): FeatureConfigListResponseDto[] {
        return plainToInstance(
            FeatureConfigListResponseDto,
            entities.map((e: FeatureConfigDoc | FeatureConfigEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    mapGet(
        entity: FeatureConfigDoc | FeatureConfigEntity
    ): FeatureConfigGetResponseDto {
        return plainToInstance(
            FeatureConfigGetResponseDto,
            entity instanceof Document ? entity.toObject() : entity
        );
    }
}
