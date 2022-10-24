import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { ISettingService } from 'src/common/setting/interfaces/setting.service.interface';
import { SettingRepository } from 'src/common/setting/repositories/setting.repository';
import {
    Setting,
    SettingEntity,
} from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingService implements ISettingService {
    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly helperStringService: HelperStringService
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<Setting[]> {
        return this.settingRepository.findAll<Setting>(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Setting> {
        return this.settingRepository.findOneById<Setting>(_id, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Setting> {
        return this.settingRepository.findOne<Setting>({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    async create(
        { name, description, value }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<Setting> {
        let convertValue = value;
        if (typeof value === 'string') {
            convertValue = await this.convertValue(value as string);
        }

        const create: SettingEntity = {
            name,
            description,
            value: convertValue,
        };

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async updateOneById(
        _id: string,
        { description, value }: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<Setting> {
        let convertValue = value;
        if (typeof value === 'string') {
            convertValue = await this.convertValue(value as string);
        }

        const update: SettingUpdateDto = {
            description,
            value: convertValue,
        };

        return this.settingRepository.updateOneById<SettingUpdateDto>(
            _id,
            update,
            options
        );
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<Setting> {
        return this.settingRepository.deleteOne(find, options);
    }

    async convertValue(value: string): Promise<string | number | boolean> {
        return this.helperStringService.convertStringToNumberOrBooleanIfPossible(
            value
        );
    }
}
