import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_HELPER_DATE_FORMAT } from 'src/common/helper/constants/helper.enum.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/modules/setting/dtos/setting.create.dto';
import { SettingUpdateValueDto } from 'src/modules/setting/dtos/setting.update-value.dto';
import { ISettingService } from 'src/modules/setting/interfaces/setting.service.interface';
import {
    SettingDoc,
    SettingEntity,
} from 'src/modules/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/modules/setting/repository/repositories/setting.repository';

@Injectable()
export class SettingService implements ISettingService {
    private readonly timezone: string;
    private readonly timezoneOffset: string;

    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly helperNumberService: HelperNumberService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.timezone = this.configService.get<string>('app.tz');
        this.timezoneOffset = this.helperDateService.format(
            this.helperDateService.create(),
            { format: ENUM_HELPER_DATE_FORMAT.TIMEZONE }
        );
    }

    async findAll<T = SettingDoc>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        return this.settingRepository.findAll<T>(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOneById<SettingDoc>(_id, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOne<SettingDoc>({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    async create(
        { name, description, type, value }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description ?? undefined;
        create.value = value;
        create.type = type;

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async updateValue(
        repository: SettingDoc,
        { type, value }: SettingUpdateValueDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc> {
        repository.type = type;
        repository.value = value;

        return this.settingRepository.save(repository, options);
    }

    async delete(
        repository: SettingDoc,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.softDelete(repository, options);
    }

    async getValue<T>(setting: SettingDoc): Promise<T> {
        if (
            setting.type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (setting.value === 'true' || setting.value === 'false')
        ) {
            return (setting.value === 'true') as any;
        } else if (
            setting.type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(setting.value)
        ) {
            return Number.parseInt(setting.value) as any;
        } else if (setting.type === ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING) {
            return setting.value.split(',') as any;
        }

        return setting.value as any;
    }

    async checkValue(
        value: string,
        type: ENUM_SETTING_DATA_TYPE
    ): Promise<boolean> {
        if (
            type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (value === 'true' || value === 'false')
        ) {
            return true;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(value)
        ) {
            return true;
        } else if (
            (type === ENUM_SETTING_DATA_TYPE.STRING ||
                type === ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING) &&
            typeof value === 'string'
        ) {
            return true;
        }

        return false;
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.settingRepository.deleteMany(find, options);
    }

    async getTimezone(): Promise<string> {
        return this.timezone;
    }

    async getTimezoneOffset(): Promise<string> {
        return this.timezoneOffset;
    }
}
