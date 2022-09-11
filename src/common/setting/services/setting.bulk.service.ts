import { Injectable } from '@nestjs/common';
import { ISettingBulkService } from 'src/common/setting/interfaces/setting.bulk-service.interface';
import { SettingBulkRepository } from 'src/common/setting/repositories/setting.bulk.repository';

@Injectable()
export class SettingBulkService implements ISettingBulkService {
    constructor(
        private readonly settingBulkRepository: SettingBulkRepository
    ) {}

    async deleteMany(find: Record<string, any>): Promise<boolean> {
        return this.settingBulkRepository.deleteMany(find);
    }
}
