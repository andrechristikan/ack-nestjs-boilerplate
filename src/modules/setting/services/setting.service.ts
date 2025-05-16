import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';
import { SettingCoreResponseDto } from 'src/modules/setting/dtos/response/setting.core.response.dto';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { SettingLanguageResponseDto } from 'src/modules/setting/dtos/response/setting.language.response.dto';
import { SettingTimezoneResponseDto } from 'src/modules/setting/dtos/response/setting.timezone.response.dto';
import { FILE_SIZE_IN_BYTES } from 'src/common/file/constants/file.constant';
import { SettingFileResponseDto } from 'src/modules/setting/dtos/response/setting.file.response.dto';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { SettingAuthResponseDto } from 'src/modules/setting/dtos/response/setting.auth.response.dto';
import { SettingMiddlewareResponseDto } from 'src/modules/setting/dtos/response/setting.middleware.response.dto';
import { SettingUserResponseDto } from 'src/modules/setting/dtos/response/setting.user.response.dto';
import { ISettingService } from 'src/modules/setting/interfaces/setting.service.interface';
@Injectable()
export class SettingService implements ISettingService {
    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {}

    async core(): Promise<SettingCoreResponseDto> {
        // app
        const name = this.configService.get<string>('app.name')!;
        const env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env')!;
        const timeout = this.configService.get<number>('middleware.timeout')!;

        // language
        const availableLanguage: ENUM_MESSAGE_LANGUAGE[] =
            this.configService.get<ENUM_MESSAGE_LANGUAGE[]>(
                'message.availableLanguage'
            )!;
        const currentLanguage: ENUM_MESSAGE_LANGUAGE =
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language')!;
        const settingLanguage: SettingLanguageResponseDto = {
            language: currentLanguage,
            availableLanguage,
        };

        // timezone
        const today = this.helperDateService.create();
        const timezone = this.helperDateService.getZoneOffset(today);
        const timezoneOffset = this.helperDateService.getZone(today);
        const settingTimezone: SettingTimezoneResponseDto = {
            timezone: timezone,
            timezoneOffset: timezoneOffset,
        };

        // file
        const settingFile: SettingFileResponseDto = {
            size: FILE_SIZE_IN_BYTES,
            sizeUnit: ENUM_SETTING_UNIT.BYTE,
        };

        // auth
        const passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        const passwordExpiredIn = this.configService.get<number>(
            'auth.password.expiredIn'
        )!;
        const passwordExpiredInTemporary = this.configService.get<number>(
            'auth.password.expiredInTemporary'
        )!;
        const passwordPeriod = this.configService.get<number>(
            'auth.password.period'
        )!;
        const settingAuth: SettingAuthResponseDto = {
            passwordMaxAttempt,
            passwordExpiredIn,
            passwordExpiredInUnit: ENUM_SETTING_UNIT.MILLISECOND,
            passwordExpiredInTemporary,
            passwordExpiredInTemporaryUnit: ENUM_SETTING_UNIT.MILLISECOND,
            passwordPeriod,
            passwordPeriodUnit: ENUM_SETTING_UNIT.MILLISECOND,
        };

        const bodyJson = this.configService.get<number>(
            'middleware.body.json.maxFileSize'
        )!;
        const bodyRaw = this.configService.get<number>(
            'middleware.body.raw.maxFileSize'
        )!;
        const bodyText = this.configService.get<number>(
            'middleware.body.text.maxFileSize'
        )!;
        const bodyUrlencoded = this.configService.get<number>(
            'middleware.body.urlencoded.maxFileSize'
        )!;
        const settingMiddleware: SettingMiddlewareResponseDto = {
            bodyJson,
            bodyJsonUnit: ENUM_SETTING_UNIT.BYTE,
            bodyRaw,
            bodyRawUnit: ENUM_SETTING_UNIT.BYTE,
            bodyText,
            bodyTextUnit: ENUM_SETTING_UNIT.BYTE,
            bodyUrlencoded,
            bodyUrlencodedUnit: ENUM_SETTING_UNIT.BYTE,
        };

        // user
        const usernamePrefix = this.configService.get<string>(
            'user.usernamePrefix'
        )!;
        const settingUser: SettingUserResponseDto = {
            usernamePrefix,
        };

        return {
            name,
            env,
            timeout,
            timeoutUnit: ENUM_SETTING_UNIT.MILLISECOND,
            file: settingFile,
            language: settingLanguage,
            timezone: settingTimezone,
            middleware: settingMiddleware,
            auth: settingAuth,
            user: settingUser,
        };
    }
}
