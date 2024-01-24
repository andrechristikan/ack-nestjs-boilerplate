import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/modules/setting/dtos/setting.create.dto';
import { SettingUpdateValueDto } from 'src/modules/setting/dtos/setting.update-value.dto';
import { SettingDoc } from 'src/modules/setting/repository/entities/setting.entity';

export interface ISettingService {
    findAll<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingDoc>;
    findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        { name, description, type, value }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc>;
    updateValue(
        repository: SettingDoc,
        { type, value }: SettingUpdateValueDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc>;
    delete(
        repository: SettingDoc,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc>;
    getValue<T>(setting: SettingDoc): Promise<T>;
    checkValue(value: string, type: ENUM_SETTING_DATA_TYPE): Promise<boolean>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
    getTimezone(): Promise<string>;
}
