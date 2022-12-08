import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
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
        data: SettingEntity,
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

    getMaintenance(): Promise<SettingEntity>;

    getMobileNumberCountryCodeAllowed(): Promise<SettingEntity>;

    getPasswordAttempt(): Promise<SettingEntity>;

    getMaxPasswordAttempt(): Promise<SettingEntity>;
}
