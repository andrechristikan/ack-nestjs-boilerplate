import { applyDecorators } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import {
    SettingDocParamsGet,
    SettingDocParamsGetByName,
} from 'src/common/setting/constants/setting.doc.constant';
import { SettingGetSerialization } from 'src/common/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/common/setting/serializations/setting.list.serialization';
import {
    SETTING_DEFAULT_AVAILABLE_SEARCH,
    SETTING_DEFAULT_AVAILABLE_SORT,
} from 'src/common/setting/constants/setting.list.constant';

export function SettingListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<SettingListSerialization>('setting.list', {
            auth: {
                jwtAccessToken: false,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: SettingListSerialization,
                availableSort: SETTING_DEFAULT_AVAILABLE_SORT,
                availableSearch: SETTING_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function SettingGetByNameDoc(): MethodDecorator {
    return applyDecorators(
        Doc<SettingGetSerialization>('setting.getByName', {
            auth: {
                jwtAccessToken: false,
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

export function SettingGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<SettingGetSerialization>('setting.get', {
            auth: {
                jwtAccessToken: false,
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
