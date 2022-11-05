import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { ISettingBulkService } from 'src/common/setting/interfaces/setting.bulk-service.interface';
import {
    SettingEntity,
    SettingRepository,
} from 'src/common/setting/repository/entities/setting.entity';

@Injectable()
export class SettingBulkService implements ISettingBulkService {
    constructor(
        @DatabaseRepository(SettingRepository)
        private readonly settingRepository: IDatabaseRepository<SettingEntity>
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.settingRepository.deleteMany(find, options);
    }
}
