import { applyDecorators } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import {
    SettingDocParamsGet,
    SettingDocParamsGetByName,
} from 'src/common/setting/constants/setting.doc.constant';
import { SettingGetSerialization } from 'src/common/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/common/setting/serializations/setting.list.serialization';

export function SettingListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<SettingListSerialization>('setting.list', {
            auth: {
                jwtAccessToken: false,
            },
            response: {
                serialization: SettingListSerialization,
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
