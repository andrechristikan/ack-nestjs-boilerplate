import {
    Body,
    Controller,
    InternalServerErrorException,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { AuthAdminJwtGuard } from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import {
    RequestParamGuard,
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { SettingUpdateGuard } from 'src/common/setting/decorators/setting.admin.decorator';
import { GetSetting } from 'src/common/setting/decorators/setting.decorator';
import { SettingUpdateDoc } from 'src/common/setting/docs/setting.admin.doc';
import { SettingRequestDto } from 'src/common/setting/dtos/setting.request.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { SettingDocument } from 'src/common/setting/schemas/setting.schema';
import { SettingService } from 'src/common/setting/services/setting.service';

@ApiTags('admin.setting')
@Controller({
    version: '1',
    path: '/setting',
})
export class SettingAdminController {
    constructor(private readonly settingService: SettingService) {}

    @SettingUpdateDoc()
    @Response('setting.update', {
        classSerialization: ResponseIdSerialization,
    })
    @SettingUpdateGuard()
    @RequestParamGuard(SettingRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.SETTING_READ,
        ENUM_AUTH_PERMISSIONS.SETTING_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Put('/update/:setting')
    async update(
        @GetSetting() setting: SettingDocument,
        @Body()
        body: SettingUpdateDto
    ): Promise<IResponse> {
        try {
            await this.settingService.updateOneById(setting._id, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return {
            _id: setting._id,
        };
    }
}
