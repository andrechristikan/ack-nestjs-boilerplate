import { PartialType } from '@nestjs/mapped-types';
import { SettingGetSerialization } from './setting.get.serialization';

export class SettingListSerialization extends PartialType(
    SettingGetSerialization
) {}
