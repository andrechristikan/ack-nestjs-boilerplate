import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';

export class SettingListResponseDto<T = any> extends SettingGetResponseDto<T> {}
