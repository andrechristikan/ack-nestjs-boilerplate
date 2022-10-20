import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import {
    SettingDocParamsGet,
    SettingDocParamsGetByName,
} from 'src/common/setting/constants/setting.doc.constant';
import { SettingGetSerialization } from 'src/common/setting/serializations/setting.get.serialization';

export function SettingGetByNameDoc(): any {
    return applyDecorators(
        Doc('setting.getByName', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: SettingDocParamsGetByName,
            },
            response: { classSerialization: SettingGetSerialization },
        })
    );
}

export function SettingGetDoc(): any {
    return applyDecorators(
        Doc('setting.get', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: SettingDocParamsGet,
            },
            response: { classSerialization: SettingGetSerialization },
        })
    );
}
