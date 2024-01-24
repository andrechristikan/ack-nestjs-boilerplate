import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocErrorGroup,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { SettingDocParamsId } from 'src/modules/setting/constants/setting.doc.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/modules/setting/constants/setting.status-code.constant';
import { SettingUpdateValueDto } from 'src/modules/setting/dtos/setting.update-value.dto';
import { SettingGetSerialization } from 'src/modules/setting/serializations/setting.get.serialization';
import { SettingListSerialization } from 'src/modules/setting/serializations/setting.list.serialization';

export function SettingAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get list of settings',
        }),
        DocAuth({ apiKey: true }),
        DocResponsePaging<SettingListSerialization>('setting.list', {
            serialization: SettingListSerialization,
        })
    );
}

export function SettingAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get detail a setting' }),
        DocRequest({
            params: SettingDocParamsId,
        }),
        DocResponse<SettingGetSerialization>('setting.get', {
            serialization: SettingGetSerialization,
        }),
        DocAuth({ apiKey: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR,
                messagePath: 'setting.error.notFound',
            }),
        ])
    );
}

export function SettingAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a setting' }),
        DocRequest({
            params: SettingDocParamsId,
            body: SettingUpdateValueDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            jwtAccessToken: true,
            apiKey: true,
        }),
        DocResponse<ResponseIdSerialization>('setting.update', {
            serialization: ResponseIdSerialization,
        }),
        DocGuard({ role: true, policy: true }),
        DocErrorGroup([
            DocDefault({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR,
                messagePath: 'setting.error.notFound',
            }),
            DocDefault({
                httpStatus: HttpStatus.BAD_REQUEST,
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_VALUE_NOT_ALLOWED_ERROR,
                messagePath: 'setting.error.valueNotAllowed',
            }),
        ])
    );
}
