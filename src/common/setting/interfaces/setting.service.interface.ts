import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { SettingDocument } from 'src/common/setting/schemas/setting.schema';

export interface ISettingService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingDocument[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingDocument>;

    findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingDocument>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    create(
        data: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDocument>;

    updateOneById(
        _id: string,
        data: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<SettingDocument>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SettingDocument>;

    convertValue(value: string): Promise<string | number | boolean>;
}
