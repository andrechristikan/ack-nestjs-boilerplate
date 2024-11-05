import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { SettingCoreResponseDto } from 'src/modules/setting/dtos/response/setting.core.response.dto';
import { SettingService } from 'src/modules/setting/services/setting.service';
import { SettingSystemCoreDoc } from 'src/modules/setting/docs/setting.system.doc';

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
