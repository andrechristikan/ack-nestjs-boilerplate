import { PartialType } from '@nestjs/swagger';
import { SettingGetSerialization } from './setting.get.serialization';

export class SettingListSerialization extends PartialType(
    SettingGetSerialization
) {}
