import {
    Controller,
    InternalServerErrorException,
    Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import {
    AuthUpdateActiveGuard,
    AuthUpdateInactiveGuard,
} from 'src/common/auth/decorators/auth.admin.decorator';
import {
    AuthJwtAdminAccessProtected,
    AuthJwtPermissionProtected,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    AuthActiveDoc,
    AuthInactiveDoc,
} from 'src/common/auth/docs/auth.admin.doc';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { SettingService } from 'src/common/setting/services/setting.service';
import { GetUser } from 'src/modules/user/decorators/user.decorator';
import { UserRequestDto } from 'src/modules/user/dtos/user.request.dto';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.admin.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @AuthInactiveDoc()
    @Response('user.inactive')
    @AuthUpdateInactiveGuard()
    @RequestParamGuard(UserRequestDto)
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_UPDATE,
        ENUM_AUTH_PERMISSIONS.USER_INACTIVE
    )
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:user/inactive')
    async inactive(@GetUser() user: IUserEntity): Promise<void> {
        try {
            await this.authService.inactive(user._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @AuthActiveDoc()
    @Response('user.active')
    @AuthUpdateActiveGuard()
    @RequestParamGuard(UserRequestDto)
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_UPDATE,
        ENUM_AUTH_PERMISSIONS.USER_ACTIVE
    )
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:user/active')
    async active(@GetUser() user: IUserEntity): Promise<void> {
        try {
            await this.authService.active(user._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }
}
