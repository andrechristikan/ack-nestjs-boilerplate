import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    AuthJwtPayload,
    AuthJwtToken,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtRefreshProtected,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    AuthChangePasswordDoc,
    AuthInfoDoc,
    AuthLoginDoc,
    AuthRefreshDoc,
} from 'src/common/auth/docs/auth.doc';
import { AuthChangePasswordDto } from 'src/common/auth/dtos/auth.change-password.dto';
import { AuthGrantPermissionDto } from 'src/common/auth/dtos/auth.grant-permission.dto';
import { AuthLoginDto } from 'src/common/auth/dtos/auth.login.dto';
import { AuthGrantPermissionSerialization } from 'src/common/auth/serializations/auth.grant-permission.serialization';
import { AuthLoginSerialization } from 'src/common/auth/serializations/auth.login.serialization';
import { AuthPayloadSerialization } from 'src/common/auth/serializations/auth.payload.serialization';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.enum.constant';
import { Logger } from 'src/common/logger/decorators/logger.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { SettingService } from 'src/common/setting/services/setting.service';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.user.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthUserController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly settingService: SettingService
    ) {}

    @AuthChangePasswordDoc()
    @Response('user.changePassword')
    @AuthJwtAccessProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: AuthChangePasswordDto,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const user: UserEntity = await this.userService.findOneById(_id);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean =
            await this.settingService.getPasswordAttempt();
        const maxPasswordAttempt: number =
            await this.settingService.getMaxPasswordAttempt();
        if (passwordAttempt && user.passwordAttempt >= maxPasswordAttempt) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_ATTEMPT_MAX_ERROR,
                message: 'user.error.passwordAttemptMax',
            });
        }

        const matchPassword: boolean = await this.authService.validateUser(
            body.oldPassword,
            user.password
        );
        if (!matchPassword) {
            if (passwordAttempt)
                await this.authService.increasePasswordAttempt(user._id);

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
            });
        }

        const newMatchPassword: boolean = await this.authService.validateUser(
            body.newPassword,
            user.password
        );
        if (newMatchPassword) {
            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NEW_MUST_DIFFERENCE_ERROR,
                message: 'user.error.newPasswordMustDifference',
            });
        }

        if (passwordAttempt) {
            try {
                await this.authService.resetPasswordAttempt(user._id);
            } catch (err: any) {
                throw new InternalServerErrorException({
                    statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                    message: 'http.serverError.internalServerError',
                    error: err.message,
                });
            }
        }

        try {
            const password = await this.authService.createPassword(
                body.newPassword
            );

            await this.authService.updatePassword(user._id, password);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @AuthInfoDoc()
    @Response('user.info', { serialization: AuthPayloadSerialization })
    @AuthJwtAccessProtected()
    @Get('/info')
    async info(
        @AuthJwtPayload() user: AuthPayloadSerialization
    ): Promise<IResponse> {
        return user;
    }

    @Response('user.grantPermission', {
        serialization: AuthGrantPermissionSerialization,
    })
    @AuthJwtAccessProtected()
    @Post('/grant-permission')
    async permissionToken(
        @AuthJwtPayload() user: AuthPayloadSerialization,
        @Body() { scope }: AuthGrantPermissionDto
    ): Promise<IResponse> {
        const check: IUserEntity = await this.userService.findOneById(
            user._id,
            { join: true }
        );
        if (!check) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const permissions: PermissionEntity[] =
            await this.authService.getPermissionByGroupFromUser(
                user._id,
                scope
            );

        const payload = this.authService.payloadGrantPermission(
            user._id,
            permissions
        );

        return payload;
    }
}
