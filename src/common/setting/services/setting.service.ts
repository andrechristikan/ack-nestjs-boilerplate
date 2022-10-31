import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { SETTING_REPOSITORY } from 'src/common/setting/constants/setting.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { ISettingService } from 'src/common/setting/interfaces/setting.service.interface';
import { SettingEntity } from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class SettingService implements ISettingService {
    constructor(
        @DatabaseRepository(SETTING_REPOSITORY)
        private readonly settingRepository: IDatabaseRepository<SettingEntity>,
        private readonly helperStringService: HelperStringService
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
        { name, description, value }: SettingCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingEntity> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description;
        create.value = value;

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async updateOneById(
        _id: string,
        { description, value }: SettingUpdateDto,
        options?: IDatabaseOptions
    ): Promise<SettingEntity> {
        const update: SettingUpdateDto = {
            description,
            value,
        };

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

    async getValue<T>(setting: SettingEntity): Promise<T> {
        return this.helperStringService.convertStringToNumberOrBooleanIfPossible<T>(
            setting.value
        );
    }
}
