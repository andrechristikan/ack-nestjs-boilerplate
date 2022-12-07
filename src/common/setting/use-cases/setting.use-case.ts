import { Injectable } from '@nestjs/common';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';

@Injectable()
export class SettingUseCase {
    constructor(private readonly helperNumberService: HelperNumberService) {}

    async create(data: SettingCreateDto): Promise<SettingCreateDto> {
        return data;
    }

    async update(data: SettingUpdateDto): Promise<SettingUpdateDto> {
        return data;
    }

    async getValue<T>(setting: SettingEntity): Promise<T> {
        if (
            setting.type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (setting.value === 'true' || setting.value === 'false')
        ) {
            return (setting.value === 'true' ? true : false) as any;
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
        let check = false;

        if (
            type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (value === 'true' || value === 'false')
        ) {
            check = true;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(value)
        ) {
            check = true;
        } else if (
            (type === ENUM_SETTING_DATA_TYPE.STRING ||
                type === ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING) &&
            typeof value === 'string'
        ) {
            check = true;
        }

        return check;
    }
}
