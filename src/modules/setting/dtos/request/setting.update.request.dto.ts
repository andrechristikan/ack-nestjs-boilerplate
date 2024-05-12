import { PickType } from '@nestjs/swagger';
import { SettingCreateRequestDto } from 'src/modules/setting/dtos/request/setting.create.request.dto';

export class SettingUpdateRequestDto extends PickType(SettingCreateRequestDto, [
    'value',
    'description',
] as const) {}
