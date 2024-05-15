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
        return this.settingRepository.findAll<SettingDoc>(find, options);
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
        { name, description, type, value }: SettingCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description ?? undefined;
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

    async delete(
        repository: SettingDoc,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.softDelete(repository, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.settingRepository.deleteMany(find, options);
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
        } else if (type === ENUM_SETTING_DATA_TYPE.JSON) {
            return JSON.parse(value) as T;
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
        } else if (type === ENUM_SETTING_DATA_TYPE.JSON) {
            try {
                JSON.parse(value);
                return true;
            } catch (_) {}
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

    async getMobileNumberAllowed(
        options?: IDatabaseFindOneOptions
    ): Promise<SettingGetResponseDto<string[]>> {
        const setting = await this.findOneByName(
            'mobileNumberAllowed',
            options
        );

        return this.mapGet(setting);
    }

    async checkMobileNumberAllowed(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ) {
        const setting = await this.findOneByName(
            'mobileNumberAllowed',
            options
        );

        const mapped = await this.mapGet(setting);

        return mapped.value.some((e: string) => mobileNumber.startsWith(e));
    }
}
