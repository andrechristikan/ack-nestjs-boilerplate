import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateValueDto } from 'src/common/setting/dtos/setting.update-value.dto';
import {
    SettingDoc,
    SettingEntity,
} from 'src/common/setting/repository/entities/setting.entity';

export interface ISettingService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingEntity[]>;

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
        options?: IDatabaseOptions
    ): Promise<number>;

    create(
        { name, description, type, value }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc>;

    updateValue(
        repository: SettingDoc,
        { description, type, value }: SettingUpdateValueDto
    ): Promise<SettingDoc>;

    delete(repository: SettingDoc): Promise<SettingDoc>;

    getValue<T>(setting: SettingDoc): Promise<T>;

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
