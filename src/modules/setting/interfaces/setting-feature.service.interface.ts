import {
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from '@common/database/interfaces/database.interface';
import { SettingFeatureUpdateRequestDto } from '@modules/setting/dtos/request/setting-feature.update.request.dto';
import { SettingFeatureGetResponseDto } from '@modules/setting/dtos/response/setting-feature.get.response.dto';
import { SettingFeatureListResponseDto } from '@modules/setting/dtos/response/setting-feature.list.response.dto';
import {
    SettingJson,
    SettingValue,
} from '@modules/setting/interfaces/setting.interface';
import {
    SettingFeatureDoc,
    SettingFeatureEntity,
} from '@modules/setting/repository/entities/setting-feature.entity';

export interface ISettingFeatureService {
    flush(): Promise<void>;
    get(key: string): Promise<SettingJson>;
    update(
        repository: SettingFeatureDoc,
        dto: SettingFeatureUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingFeatureDoc>;
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingFeatureDoc[]>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<void>;
    createMany(entries: SettingFeatureEntity[]): Promise<void>;
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
