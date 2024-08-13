import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_HELPER_DATE_FORMAT } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/enums/setting.enum';
import { SettingCreateRequestDto } from 'src/modules/setting/dtos/request/setting.create.request.dto';
import { SettingUpdateRequestDto } from 'src/modules/setting/dtos/request/setting.update.request.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { SettingListResponseDto } from 'src/modules/setting/dtos/response/setting.list.response.dto';
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
        this.timezone = this.configService.get<string>('app.timezone');
        this.timezoneOffset = this.helperDateService.format(
            this.helperDateService.create(),
            { format: ENUM_HELPER_DATE_FORMAT.TIMEZONE }
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingDoc[]> {
        return this.settingRepository.findAll(find, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOne(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOneById(_id, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOne({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    async create(
        { name, description, type, value }: SettingCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description;
        create.value = value;
        create.type = type;

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async update(
        repository: SettingDoc,
        { description, value }: SettingUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc> {
        repository.description = description;
        repository.value = value;

        return this.settingRepository.save(repository, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        try {
            await this.settingRepository.deleteMany(find, options);

            return true;
        } catch (error: unknown) {
            throw error;
        }
    }

    getValue<T>(type: ENUM_SETTING_DATA_TYPE, value: string): T {
        if (
            type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (value === 'true' || value === 'false')
        ) {
            return (value === 'true') as T;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(value)
        ) {
            return Number.parseInt(value) as T;
        }

        return value as T;
    }

    checkValue(type: ENUM_SETTING_DATA_TYPE, value: string): boolean {
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
            type === ENUM_SETTING_DATA_TYPE.STRING &&
            typeof value === 'string'
        ) {
            return true;
        }

        return false;
    }

    async getTimezone(): Promise<string> {
        return this.timezone;
    }

    async getTimezoneOffset(): Promise<string> {
        return this.timezoneOffset;
    }

    async mapList<T = any>(
        settings: SettingDoc[]
    ): Promise<SettingListResponseDto<T>[]> {
        return settings.map(e => {
            const parseValue = this.getValue<T>(e.type, e.value);

            return { ...e.toObject(), value: parseValue };
        });
    }

    async mapGet<T = any>(
        setting: SettingDoc
    ): Promise<SettingGetResponseDto<T>> {
        const parseValue = this.getValue<T>(setting.type, setting.value);

        return { ...setting.toObject(), value: parseValue };
    }
}
