import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import {
    FILE_SIZE_IN_BYTES,
    FILE_SIZE_LARGE_IN_BYTES,
    FILE_SIZE_MEDIUM_IN_BYTES,
} from 'src/common/file/constants/file.constant';
import { MessageService } from 'src/common/message/services/message.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { SettingPublicCoreDoc } from 'src/modules/setting/docs/setting.public.doc';
import { SettingCoreSerialization } from 'src/modules/setting/serializations/setting.core.serialization';
import { SettingFileSerialization } from 'src/modules/setting/serializations/setting.file.serialization';
import { SettingTimezoneSerialization } from 'src/modules/setting/serializations/setting.timezone.serialization';
import { SettingService } from 'src/modules/setting/services/setting.service';

@ApiTags('modules.public.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingPublicController {
    constructor(
        private readonly settingService: SettingService,
        private readonly messageService: MessageService
    ) {}

    @SettingPublicCoreDoc()
    @Response('setting.core', {
        serialization: SettingCoreSerialization,
    })
    @ApiKeyPublicProtected()
    @Get('/core')
    async getUserMaxCertificate(): Promise<IResponse> {
        const languages: string[] = this.messageService.getAvailableLanguages();

        const tz: string = await this.settingService.getTimezone();
        const timezoneOffset: string =
            await this.settingService.getTimezoneOffset();

        const timezone: SettingTimezoneSerialization = {
            timezone: tz,
            timezoneOffset: timezoneOffset,
        };

        const file: SettingFileSerialization = {
            sizeInBytes: FILE_SIZE_IN_BYTES,
            sizeMediumInBytes: FILE_SIZE_MEDIUM_IN_BYTES,
            sizeLargeInBytes: FILE_SIZE_LARGE_IN_BYTES,
        };

        return {
            data: {
                languages,
                file,
                timezone,
            },
        };
    }
}
