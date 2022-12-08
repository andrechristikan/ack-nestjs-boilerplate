import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { ISettingService } from 'src/common/setting/interfaces/setting.service.interface';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/common/setting/repository/repositories/setting.repository';

@Injectable()
export class SettingService implements ISettingService {
    constructor(private readonly settingRepository: SettingRepository) {}

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
        data: SettingEntity,
        options?: IDatabaseCreateOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.create<SettingEntity>(data, options);
    }

    async updateOneById(
        _id: string,
        data: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.updateOneById<SettingUpdateDto>(
            _id,
            data,
            options
        );
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.deleteOne(find, options);
    }

    async getMaintenance(): Promise<SettingEntity> {
        return this.findOneByName('maintenance');
    }

    async getMobileNumberCountryCodeAllowed(): Promise<SettingEntity> {
        return this.findOneByName('mobileNumberCountryCodeAllowed');
    }

    async getPasswordAttempt(): Promise<SettingEntity> {
        return this.findOneByName('passwordAttempt');
    }

    async getMaxPasswordAttempt(): Promise<SettingEntity> {
        return this.findOneByName('maxPasswordAttempt');
    }
}
