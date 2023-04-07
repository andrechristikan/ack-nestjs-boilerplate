import { OmitType } from '@nestjs/swagger';
import { SettingCreateDto } from './setting.create.dto';

export class SettingUpdateValueDto extends OmitType(SettingCreateDto, [
    'name',
    'description',
] as const) {}
