import { OmitType } from '@nestjs/swagger';
import { SettingCreateDto } from './setting.create.dto';

export class SettingUpdateDto extends OmitType(SettingCreateDto, [
    'name',
] as const) {}
