import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateValueDto } from 'src/common/setting/dtos/setting.update-value.dto';
import { ISettingService } from 'src/common/setting/interfaces/setting.service.interface';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/common/setting/repository/repositories/setting.repository';

@Injectable()
export class SettingService implements ISettingService {
    private readonly mobileNumberCountryCodeAllowed: string[];
    private readonly passwordAttempt: boolean;
    private readonly maxPasswordAttempt: number;

    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly configService: ConfigService,
        private readonly helperNumberService: HelperNumberService
    ) {
        this.mobileNumberCountryCodeAllowed = this.configService.get<string[]>(
            'user.mobileNumberCountryCodeAllowed'
        );
        this.passwordAttempt = this.configService.get<boolean>(
            'auth.password.attempt'
        );
        this.maxPasswordAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingEntity[]> {
        return this.settingRepository.findAll<SettingEntity>(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.findOneById<SettingEntity>(_id, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.findOne<SettingEntity>({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    async create(
        { name, description, type, value }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingEntity> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description ?? undefined;
        create.value = value;
        create.type = type;

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async updateValue(
        _id: string,
        data: SettingUpdateValueDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.updateOneById<SettingUpdateValueDto>(
            _id,
            data,
            options
        );
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.deleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.deleteOne(find, options);
    }

    async getValue<T>(setting: SettingEntity): Promise<T> {
        if (
            setting.type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (setting.value === 'true' || setting.value === 'false')
        ) {
            return (setting.value === 'true') as any;
        } else if (
            setting.type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(setting.value)
        ) {
            return this.helperNumberService.create(setting.value) as any;
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

    async getMaintenance(): Promise<boolean> {
        const setting: SettingEntity = await this.findOneByName('maintenance');
        return this.getValue<boolean>(setting);
    }

    async getMobileNumberCountryCodeAllowed(): Promise<string[]> {
        return this.mobileNumberCountryCodeAllowed;
    }

    async getPasswordAttempt(): Promise<boolean> {
        return this.passwordAttempt;
    }

    async getMaxPasswordAttempt(): Promise<number> {
        return this.maxPasswordAttempt;
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.settingRepository.deleteMany(find, options);
    }
}
