import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { FILE_SIZE_IN_BYTES } from 'src/common/file/constants/file.constant';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { MessageService } from 'src/common/message/services/message.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { SettingPublicCoreDoc } from 'src/modules/setting/docs/setting.public.doc';
import { SettingCoreResponseDto } from 'src/modules/setting/dtos/response/setting.core.response.dto';
import { SettingFileResponseDto } from 'src/modules/setting/dtos/response/setting.file.response.dto';
import { SettingLanguageResponseDto } from 'src/modules/setting/dtos/response/setting.language.response.dto';
import { SettingTimezoneResponseDto } from 'src/modules/setting/dtos/response/setting.timezone.response.dto';
import { SettingService } from 'src/modules/setting/services/setting.service';

// TODO: MOBILE NUMBER -> COUNTRY ALLOWED TABLE SEPARATE
@ApiTags('modules.public.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingPublicController {
    constructor(
        private readonly messageService: MessageService,
        private readonly settingService: SettingService
    ) {}

    @SettingPublicCoreDoc()
    @Response('setting.core')
    @ApiKeyPublicProtected()
    @Get('/core')
    async getUserMaxCertificate(): Promise<IResponse<SettingCoreResponseDto>> {
        const availableLanguage: ENUM_MESSAGE_LANGUAGE[] =
            this.messageService.getAvailableLanguages();
        const currentLanguage: ENUM_MESSAGE_LANGUAGE =
            this.messageService.getLanguage();

        const language: SettingLanguageResponseDto = {
            language: currentLanguage,
            availableLanguage,
        };

        const tz: string = await this.settingService.getTimezone();
        const timezoneOffset: string =
            await this.settingService.getTimezoneOffset();

        const timezone: SettingTimezoneResponseDto = {
            timezone: tz,
            timezoneOffset: timezoneOffset,
        };

        const file: SettingFileResponseDto = {
            sizeInBytes: FILE_SIZE_IN_BYTES,
        };

        return {
            data: {
                timezone,
                language,
                file,
            },
        };
    }
}
