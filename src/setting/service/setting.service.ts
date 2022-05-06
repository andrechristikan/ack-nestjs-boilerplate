import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/database/database.decorator';
import { IDatabaseFindAllOptions } from 'src/database/database.interface';
import { HelperStringService } from 'src/utils/helper/service/helper.string.service';
import { SettingCreateDto } from '../dto/setting.create.dto';
import { SettingUpdateDto } from '../dto/setting.update.dto';
import { SettingDocument, SettingEntity } from '../schema/setting.schema';
import { SettingGetSerialization } from '../serialization/setting.get.serialization';
import { SettingListSerialization } from '../serialization/setting.list.serialization';

@Injectable()
export class SettingService {
    constructor(
        @DatabaseEntity(SettingEntity.name)
        private readonly settingModel: Model<SettingDocument>,
        private readonly helperStringService: HelperStringService
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingDocument[]> {
        const settings = this.settingModel.find(find);

        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            settings.limit(options.limit).skip(options.skip);
        }

        if (options && options.sort) {
            settings.sort(options.sort);
        }

        return settings.lean();
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.settingModel.countDocuments(find);
    }

    async findOneById(_id: string): Promise<SettingDocument> {
        return this.settingModel.findById(_id).lean();
    }

    async findOneByName(name: string): Promise<SettingDocument> {
        return this.settingModel.findOne({ name }).lean();
    }

    async create({
        name,
        description,
        value,
    }: SettingCreateDto): Promise<SettingDocument> {
        const create: SettingDocument = new this.settingModel();

        let convertValue = value;
        if (typeof value === 'string') {
            convertValue = await this.convertValue(value as string);
        }

        create.name = name;
        create.description = description;
        create.value = convertValue;
        return create.save();
    }

    async updateOneById(
        _id: string,
        { description, value }: SettingUpdateDto
    ): Promise<SettingDocument> {
        const update: SettingDocument = await this.settingModel.findById(_id);

        let convertValue = value;
        if (typeof value === 'string') {
            convertValue = await this.convertValue(value as string);
        }

        update.description = description;
        update.value = convertValue;
        return update.save();
    }

    async serializationList(
        data: SettingDocument[]
    ): Promise<SettingListSerialization[]> {
        return plainToInstance(SettingListSerialization, data);
    }

    async serializationGet(
        data: SettingDocument
    ): Promise<SettingGetSerialization> {
        return plainToInstance(SettingGetSerialization, data);
    }

    async deleteOne(find: Record<string, any>): Promise<SettingDocument> {
        return this.settingModel.findOneAndDelete(find);
    }

    async convertValue(value: string): Promise<string | number | boolean> {
        return this.helperStringService.convertStringToNumberOrBooleanIfPossible(
            value
        );
    }
}
