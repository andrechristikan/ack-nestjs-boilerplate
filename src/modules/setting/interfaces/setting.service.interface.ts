import { SettingCoreResponseDto } from '@modules/setting/dtos/response/setting.core.response.dto';

export interface ISettingService {
    core(): Promise<SettingCoreResponseDto>;
}
