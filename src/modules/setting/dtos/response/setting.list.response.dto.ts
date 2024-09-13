import { ApiProperty } from '@nestjs/swagger';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/enums/setting.enum';

export class SettingListResponseDto<T = any> extends SettingGetResponseDto<T> {}
