import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@module/api-key/decorators/api-key.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponse } from '@common/response/interfaces/response.interface';
import { SettingCoreResponseDto } from '@module/setting/dtos/response/setting.core.response.dto';
import { SettingService } from '@module/setting/services/setting.service';
import { SettingSystemCoreDoc } from '@module/setting/docs/setting.system.doc';

@ApiTags('modules.system.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingSystemController {
    constructor(private readonly settingService: SettingService) {}

    @SettingSystemCoreDoc()
    @Response('setting.core')
    @ApiKeySystemProtected()
    @Get('/core')
    async getUserMaxCertificate(): Promise<IResponse<SettingCoreResponseDto>> {
        const coreSetting = await this.settingService.core();

        return {
            data: coreSetting,
        };
    }
}
