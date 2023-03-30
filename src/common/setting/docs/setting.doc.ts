import { applyDecorators } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import {
    SettingDocParamsGet,
    SettingDocParamsGetByName,
} from 'src/common/setting/constants/setting.doc.constant';
import { SettingGetSerialization } from 'src/common/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/common/setting/serializations/setting.list.serialization';
import {
    SETTING_DEFAULT_AVAILABLE_ORDER_BY,
    SETTING_DEFAULT_AVAILABLE_SEARCH,
} from 'src/common/setting/constants/setting.list.constant';

export function SettingListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<SettingListSerialization>('setting.list', {
            auth: {
                jwtAccessToken: false,
            },
            response: {
                serialization: SettingListSerialization,
                availableOrderBy: SETTING_DEFAULT_AVAILABLE_ORDER_BY,
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
            },
            request: {
                params: SettingDocParamsGetByName,
            },
            response: { serialization: SettingGetSerialization },
        })
    );
}

export function SettingGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<SettingGetSerialization>('setting.get', {
            auth: {
                jwtAccessToken: false,
            },
            request: {
                params: SettingDocParamsGet,
            },
            response: { serialization: SettingGetSerialization },
        })
    );
}
