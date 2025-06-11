import {
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
} from '@common/database/interfaces/database.interface';
import { SettingFeatureGetResponseDto } from '@modules/setting/dtos/response/setting-feature.get.response.dto';
import { SettingFeatureListResponseDto } from '@modules/setting/dtos/response/setting-feature.list.response.dto';
import { SettingValue } from '@modules/setting/interfaces/setting.interface';
import {
    SettingFeatureDoc,
    SettingFeatureEntity,
} from '@modules/setting/repository/entities/setting-feature.entity';

export interface ISettingFeatureService {
    reloadAllKeys(): Promise<void>;
    get<T = SettingValue>(key: string, fallback?: T): Promise<T | undefined>;
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingFeatureDoc[]>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<void>;
    createMany(entries: SettingFeatureEntity[]): Promise<void>;
    create(entity: SettingFeatureEntity): Promise<SettingFeatureDoc>;
    delete(key: string): Promise<SettingFeatureDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    mapList(
        entities: SettingFeatureDoc[] | SettingFeatureEntity[]
    ): SettingFeatureListResponseDto[];
    mapGet(
        entity: SettingFeatureDoc | SettingFeatureEntity
    ): SettingFeatureGetResponseDto;
}
