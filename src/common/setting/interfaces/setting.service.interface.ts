import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
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

    updateOneById(
        _id: string,
        data: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity>;

    getMaintenance(): Promise<boolean>;

    getMobileNumberCountryCodeAllowed(): Promise<string[]>;

    getPasswordAttempt(): Promise<boolean>;

    getMaxPasswordAttempt(): Promise<number>;
}
