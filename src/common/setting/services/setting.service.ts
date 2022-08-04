import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { IDatabaseFindAllOptions } from 'src/common/database/database.interface';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { SettingCreateDto } from '../dtos/setting.create.dto';
import { SettingUpdateDto } from '../dtos/setting.update.dto';
import { SettingDocument, SettingEntity } from '../schemas/setting.schema';

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

    async deleteOne(find: Record<string, any>): Promise<SettingDocument> {
        return this.settingModel.findOneAndDelete(find);
    }

    async convertValue(value: string): Promise<string | number | boolean> {
        return this.helperStringService.convertStringToNumberOrBooleanIfPossible(
            value
        );
    }
}
