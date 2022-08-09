import { OmitType } from '@nestjs/mapped-types';
import { SettingCreateDto } from './setting.create.dto';

export class SettingUpdateDto extends OmitType(SettingCreateDto, [
    'name',
] as const) {}
