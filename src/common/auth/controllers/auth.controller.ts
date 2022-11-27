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

@ApiTags('modules.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly settingService: SettingService
    ) {}

    @AuthLoginDoc()
    @Response('user.login', {
        serialization: AuthLoginSerialization,
    })
    @Logger(ENUM_LOGGER_ACTION.LOGIN, { tags: ['login', 'withEmail'] })
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Body() { username, password, rememberMe }: AuthLoginDto
    ): Promise<IResponse> {
        const user: IUserEntity =
            await this.userService.findOneByUsername<IUserEntity>(username, {
                join: true,
            });
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

        const validate: boolean = await this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            if (passwordAttempt)
                await this.authService.increasePasswordAttempt(user._id);

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
            });
        } else if (!user.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        } else if (!user.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR,
                message: 'role.error.inactive',
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

        const payload: AuthPayloadSerialization =
            await this.authService.payloadSerialization(user);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        rememberMe = rememberMe ? true : false;
        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(
                payload,
                rememberMe
            );
        const payloadRefreshToken: Record<string, any> =
            await this.authService.createPayloadRefreshToken(
                payload._id,
                rememberMe,
                {
                    loginDate: payloadAccessToken.loginDate,
                }
            );

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: Record<string, any> | string =
            payloadAccessToken;
        let payloadHashedRefreshToken: Record<string, any> | string =
            payloadRefreshToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
            payloadHashedRefreshToken =
                await this.authService.encryptRefreshToken(payloadRefreshToken);
        }

        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payloadHashedRefreshToken,
            { rememberMe }
        );

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);

        if (checkPasswordExpired) {
            return {
                metadata: {
                    // override status code and message
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR,
                    message: 'user.error.passwordExpired',
                },
                tokenType,
                expiresIn,
                accessToken,
                refreshToken,
            };
        }

        return {
            tokenType,
            expiresIn,
            accessToken,
            refreshToken,
        };
    }

    @AuthRefreshDoc()
    @Response('user.refresh', { serialization: AuthLoginSerialization })
    @AuthJwtRefreshProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtPayload()
        { _id, rememberMe, loginDate }: Record<string, any>,
        @AuthJwtToken() refreshToken: string
    ): Promise<IResponse> {
        const user: IUserEntity =
            await this.userService.findOneById<IUserEntity>(_id, {
                join: true,
            });

        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        } else if (!user.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        } else if (!user.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);

        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR,
                message: 'user.error.passwordExpired',
            });
        }

        const payload: AuthPayloadSerialization =
            await this.authService.payloadSerialization(user);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(
                payload,
                rememberMe,
                {
                    loginDate,
                }
            );

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: Record<string, any> | string =
            payloadAccessToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
        }

        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );

        return {
            tokenType,
            expiresIn,
            accessToken,
            refreshToken,
        };
    }
}
