import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { ISettingService } from 'src/common/setting/interfaces/setting.service.interface';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/common/setting/repository/repositories/setting.repository';

@Injectable()
export class SettingService implements ISettingService {
    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingEntity[]> {
        return this.settingRepository.findAll<SettingEntity>(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.findOneById<SettingEntity>(_id, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.findOne<SettingEntity>({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    async create(
        { name, description, value, type }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingEntity> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description;
        create.value = value;
        create.type = type;

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async updateOneById(
        _id: string,
        { description, value, type }: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity> {
        const update: SettingUpdateDto = {
            description,
            value,
            type,
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
    ): Promise<SettingEntity> {
        return this.settingRepository.deleteOne(find, options);
    }

    async getValue<T>(setting: SettingEntity): Promise<T> {
        if (
            setting.type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (setting.value === 'true' || setting.value === 'false')
        ) {
            return (setting.value === 'true' ? true : false) as any;
        } else if (
            setting.type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(setting.value)
        ) {
            return this.helperNumberService.create(setting.value) as any;
        } else if (setting.type === ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING) {
            return setting.value.split(',') as any;
        }

        return setting.value as any;
    }

    async checkValue(
        value: string,
        type: ENUM_SETTING_DATA_TYPE
    ): Promise<boolean> {
        let check = false;

        if (
            type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (value === 'true' || value === 'false')
        ) {
            check = true;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(value)
        ) {
            check = true;
        }

        return check;
    }
}
