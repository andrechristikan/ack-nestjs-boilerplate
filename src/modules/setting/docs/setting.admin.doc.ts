import { HttpStatus, applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
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
import { SettingDocParamsId } from 'src/modules/setting/constants/setting.doc.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/modules/setting/constants/setting.status-code.constant';
import { SettingUpdateRequestDto } from 'src/modules/setting/dtos/request/setting.update.request.dto';
import { SettingGetResponseDto } from 'src/modules/setting/dtos/response/setting.get.response.dto';
import { SettingListResponseDto } from 'src/modules/setting/dtos/response/setting.list.response.dto';

export function SettingAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get list of settings',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<SettingListResponseDto>('setting.list', {
            dto: SettingListResponseDto,
        })
    );
}

export function SettingAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get detail a setting' }),
        DocRequest({
            params: SettingDocParamsId,
        }),
        DocResponse<SettingGetResponseDto>('setting.get', {
            dto: SettingGetResponseDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
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
            dto: SettingUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('setting.update', {
            dto: DatabaseIdResponseDto,
        }),
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
