import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateValueDto } from 'src/common/setting/dtos/setting.update-value.dto';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';

export interface ISettingService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingEntity[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingEntity>;

    findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingEntity>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    create(
        data: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingEntity>;

    updateValue(
        _id: string,
        data: SettingUpdateValueDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity>;

    getValue<T>(setting: SettingEntity): Promise<T>;

    checkValue(value: string, type: ENUM_SETTING_DATA_TYPE): Promise<boolean>;

    getMaintenance(): Promise<boolean>;

    getMobileNumberCountryCodeAllowed(): Promise<string[]>;

    getPasswordAttempt(): Promise<boolean>;

    getMaxPasswordAttempt(): Promise<number>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
}
