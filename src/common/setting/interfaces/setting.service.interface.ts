import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { Setting } from 'src/common/setting/schemas/setting.schema';

export interface ISettingService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<Setting[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Setting>;

    findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Setting>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    create(
        data: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<Setting>;

    updateOneById(
        _id: string,
        data: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<Setting>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<Setting>;

    getValue<T>(setting: Setting): Promise<T>;
}
