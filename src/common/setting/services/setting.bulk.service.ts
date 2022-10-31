import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { SETTING_REPOSITORY } from 'src/common/setting/constants/setting.constant';
import { ISettingBulkService } from 'src/common/setting/interfaces/setting.bulk-service.interface';
import { SettingEntity } from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingBulkService implements ISettingBulkService {
    constructor(
        @DatabaseRepository(SETTING_REPOSITORY)
        private readonly settingRepository: IDatabaseRepository<SettingEntity>
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.settingRepository.deleteMany(find, options);
    }
}
