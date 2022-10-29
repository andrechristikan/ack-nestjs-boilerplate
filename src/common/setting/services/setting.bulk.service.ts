import { Injectable } from '@nestjs/common';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { ISettingBulkService } from 'src/common/setting/interfaces/setting.bulk-service.interface';
import { SettingRepository } from 'src/common/setting/repositories/setting.repository';

@Injectable()
export class SettingBulkService implements ISettingBulkService {
    constructor(private readonly settingRepository: SettingRepository) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.settingRepository.deleteMany(find, options);
    }
}
