import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/enums/setting.enum';
import { SettingCreateRequestDto } from 'src/modules/setting/dtos/request/setting.create.request.dto';
import { SettingUpdateRequestDto } from 'src/modules/setting/dtos/request/setting.update.request.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { SettingListResponseDto } from 'src/modules/setting/dtos/response/setting.list.response.dto';
import { SettingDoc } from 'src/modules/setting/repository/entities/setting.entity';

export interface ISettingService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingDoc[]>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SettingDoc>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<SettingDoc>;
    findOneByName(
        name: string,
        options?: IDatabaseOptions
    ): Promise<SettingDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        { name, description, type, value }: SettingCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc>;
    update(
        repository: SettingDoc,
        { description, value }: SettingUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    getValue<T>(type: ENUM_SETTING_DATA_TYPE, value: string): T;
    checkValue(type: ENUM_SETTING_DATA_TYPE, value: string): boolean;
    getTimezone(): Promise<string>;
    getTimezoneOffset(): Promise<string>;
    mapList<T = any>(
        settings: SettingDoc[]
    ): Promise<SettingListResponseDto<T>[]>;
    mapGet<T = any>(setting: SettingDoc): Promise<SettingGetResponseDto<T>>;
}
