import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_HELPER_DATE_FORMAT } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import {
    ENUM_SETTING_DATA_TYPE,
    ENUM_SETTING_UNIT,
} from 'src/modules/setting/enums/setting.enum';
import { SettingCreateRequestDto } from 'src/modules/setting/dtos/request/setting.create.request.dto';
import { SettingUpdateRequestDto } from 'src/modules/setting/dtos/request/setting.update.request.dto';
import { ISettingService } from 'src/modules/setting/interfaces/setting.service.interface';
import {
    SettingDoc,
    SettingEntity,
} from 'src/modules/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/modules/setting/repository/repositories/setting.repository';
import { SettingCoreResponseDto } from 'src/modules/setting/dtos/response/setting.core.response.dto';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { SettingLanguageResponseDto } from 'src/modules/setting/dtos/response/setting.language.response.dto';
import { SettingTimezoneResponseDto } from 'src/modules/setting/dtos/response/setting.timezone.response.dto';
import { FILE_SIZE_IN_BYTES } from 'src/common/file/constants/file.constant';
import { SettingFileResponseDto } from 'src/modules/setting/dtos/response/setting.file.response.dto';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { SettingAuthResponseDto } from 'src/modules/setting/dtos/response/setting.auth.response.dto';
import { SettingMiddlewareResponseDto } from 'src/modules/setting/dtos/response/setting.middleware.response.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { SettingListResponseDto } from 'src/modules/setting/dtos/response/setting.list.response.dto';
import { SettingUserResponseDto } from 'src/modules/setting/dtos/response/setting.user.response.dto';
@Injectable()
export class SettingService implements ISettingService {
    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly helperNumberService: HelperNumberService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SettingDoc[]> {
        return this.settingRepository.findAll(find, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOne(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOneById(_id, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseOptions
    ): Promise<SettingDoc> {
        return this.settingRepository.findOne({ name }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.settingRepository.getTotal(find, options);
    }

    async create(
        { name, description, type, value }: SettingCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SettingDoc> {
        const create: SettingEntity = new SettingEntity();
        create.name = name;
        create.description = description;
        create.value = value;
        create.type = type;

        return this.settingRepository.create<SettingEntity>(create, options);
    }

    async update(
        repository: SettingDoc,
        { description, value }: SettingUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<SettingDoc> {
        repository.description = description;
        repository.value = value;

        return this.settingRepository.save(repository, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.settingRepository.deleteMany(find, options);

        return true;
    }

    getValue<T>(type: ENUM_SETTING_DATA_TYPE, value: string): T {
        if (
            type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (value === 'true' || value === 'false')
        ) {
            return (value === 'true') as T;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(value)
        ) {
            return Number.parseInt(value) as T;
        }

        return value as T;
    }

    checkValue(type: ENUM_SETTING_DATA_TYPE, value: string): boolean {
        if (
            type === ENUM_SETTING_DATA_TYPE.BOOLEAN &&
            (value === 'true' || value === 'false')
        ) {
            return true;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.NUMBER &&
            this.helperNumberService.check(value)
        ) {
            return true;
        } else if (
            type === ENUM_SETTING_DATA_TYPE.STRING &&
            typeof value === 'string'
        ) {
            return true;
        }

        return false;
    }

    async mapList<T = any>(
        settings: SettingDoc[]
    ): Promise<SettingListResponseDto<T>[]> {
        return settings.map(e => {
            const parseValue = this.getValue<T>(e.type, e.value);

            return { ...e.toObject(), value: parseValue };
        });
    }

    async mapGet<T = any>(
        setting: SettingDoc
    ): Promise<SettingGetResponseDto<T>> {
        const parseValue = this.getValue<T>(setting.type, setting.value);

        return { ...setting.toObject(), value: parseValue };
    }

    async getCore(): Promise<SettingCoreResponseDto> {
        // app
        const name = this.configService.get<string>('app.name');
        const env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        const timeout = this.configService.get<number>('middleware.timeout');

        // language
        const availableLanguage: ENUM_MESSAGE_LANGUAGE[] =
            this.configService.get<ENUM_MESSAGE_LANGUAGE[]>(
                'message.availableLanguage'
            );
        const currentLanguage: ENUM_MESSAGE_LANGUAGE =
            this.configService.get<ENUM_MESSAGE_LANGUAGE>('message.language');
        const settingLanguage: SettingLanguageResponseDto = {
            language: currentLanguage,
            availableLanguage,
        };

        // timezone
        const timezone = this.configService.get<string>('app.timezone');
        const timezoneOffset = this.helperDateService.format(
            this.helperDateService.create(),
            { format: ENUM_HELPER_DATE_FORMAT.TIMEZONE }
        );
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
        );
        const passwordExpiredIn = this.configService.get<number>(
            'auth.password.expiredIn'
        );
        const passwordExpiredInTemporary = this.configService.get<number>(
            'auth.password.expiredInTemporary'
        );
        const passwordPeriod = this.configService.get<number>(
            'auth.password.period'
        );
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
        );
        const bodyRaw = this.configService.get<number>(
            'middleware.body.raw.maxFileSize'
        );
        const bodyText = this.configService.get<number>(
            'middleware.body.text.maxFileSize'
        );
        const bodyUrlencoded = this.configService.get<number>(
            'middleware.body.urlencoded.maxFileSize'
        );
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
        );
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
