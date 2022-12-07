import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { ISettingService } from 'src/common/setting/interfaces/setting.service.interface';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/common/setting/repository/repositories/setting.repository';
import { SettingUseCase } from 'src/common/setting/use-cases/setting.use-case';

@Injectable()
export class SettingService implements ISettingService {
    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly settingUseCase: SettingUseCase
    ) {}

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
        data: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingEntity> {
        const create: SettingCreateDto = await this.settingUseCase.create(data);

        return this.settingRepository.create<SettingCreateDto>(create, options);
    }

    async updateOneById(
        _id: string,
        data: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity> {
        const update: SettingUpdateDto = await this.settingUseCase.update(data);

        return this.settingRepository.updateOneById<SettingUpdateDto>(
            _id,
            update,
            options
        );
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<SettingEntity> {
        return this.settingRepository.deleteOne(find, options);
    }

    async getMaintenance(): Promise<boolean> {
        const setting: SettingEntity = await this.findOneByName('maintenance');
        return this.settingUseCase.getValue<boolean>(setting);
    }

    async getMobileNumberCountryCodeAllowed(): Promise<string[]> {
        const setting: SettingEntity = await this.findOneByName(
            'mobileNumberCountryCodeAllowed'
        );
        return this.settingUseCase.getValue<string[]>(setting);
    }

    async getPasswordAttempt(): Promise<boolean> {
        const setting: SettingEntity = await this.findOneByName(
            'passwordAttempt'
        );
        return this.settingUseCase.getValue<boolean>(setting);
    }

    async getMaxPasswordAttempt(): Promise<number> {
        const setting: SettingEntity = await this.findOneByName(
            'maxPasswordAttempt'
        );
        return this.settingUseCase.getValue<number>(setting);
    }
}
