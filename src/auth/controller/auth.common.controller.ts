import {
    Controller,
    Post,
    Body,
    HttpStatus,
    HttpCode,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    Patch,
} from '@nestjs/common';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from '../service/auth.service';
import {
    ENUM_AUTH_STATUS_CODE_ERROR,
    ENUM_AUTH_STATUS_CODE_SUCCESS,
} from '../auth.constant';
import { Response } from 'src/utils/response/response.decorator';
import { IResponse } from 'src/utils/response/response.interface';
import { IUserDocument } from 'src/user/user.interface';
import { ENUM_LOGGER_ACTION } from 'src/logger/logger.constant';
import {
    AuthJwtGuard,
    AuthRefreshJwtGuard,
    Token,
    User,
} from '../auth.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { UserDocument } from 'src/user/schema/user.schema';
import { AuthLoginDto } from '../dto/auth.login.dto';
import { AuthChangePasswordDto } from '../dto/auth.change-password.dto';
import { AuthLoginSerialization } from '../serialization/auth.login.serialization';
import { SuccessException } from 'src/utils/error/exception/error.success.exception';
import { ErrorMeta } from 'src/utils/error/error.decorator';
import { Logger } from 'src/logger/logger.decorator';

@Controller({
    version: '1',
    path: '/auth',
})
export class AuthCommonController {
    constructor(
        private readonly userService: UserService,
        private readonly authService: AuthService
    ) {}

    @Response('auth.login', {
        statusCode: ENUM_AUTH_STATUS_CODE_SUCCESS.AUTH_LOGIN_SUCCESS,
    })
    @Logger(ENUM_LOGGER_ACTION.LOGIN, { tags: ['login', 'withEmail'] })
    @HttpCode(HttpStatus.OK)
    @ErrorMeta(AuthCommonController.name, 'login')
    @Post('/login')
    async login(@Body() body: AuthLoginDto): Promise<IResponse> {
        const rememberMe: boolean = body.rememberMe ? true : false;
        const user: IUserDocument =
            await this.userService.findOne<IUserDocument>(
                {
                    email: body.email,
                },
                {
                    populate: {
                        role: true,
                        permission: true,
                    },
                }
            );

        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const validate: boolean = await this.authService.validateUser(
            body.password,
            user.password
        );

        if (!validate) {
            throw new BadRequestException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NOT_MATCH_ERROR,
                message: 'auth.error.passwordNotMatch',
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

        const safe: AuthLoginSerialization =
            await this.authService.serializationLogin(user);

        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(safe, rememberMe);
        const payloadRefreshToken: Record<string, any> =
            await this.authService.createPayloadRefreshToken(safe, rememberMe, {
                loginDate: payloadAccessToken.loginDate,
            });

        const accessToken: string = await this.authService.createAccessToken(
            payloadAccessToken
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payloadRefreshToken,
            rememberMe
        );

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);

        if (checkPasswordExpired) {
            throw new SuccessException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR,
                message: 'auth.error.passwordExpired',
                data: {
                    accessToken,
                    refreshToken,
                },
            });
        }

        return {
            accessToken,
            refreshToken,
        };
    }

    @Response('auth.refresh')
    @AuthRefreshJwtGuard()
    @HttpCode(HttpStatus.OK)
    @ErrorMeta(AuthCommonController.name, 'refresh')
    @Post('/refresh')
    async refresh(
        @User()
        { _id, rememberMe, loginDate }: Record<string, any>,
        @Token() refreshToken: string
    ): Promise<IResponse> {
        const user: IUserDocument =
            await this.userService.findOneById<IUserDocument>(_id, {
                populate: {
                    role: true,
                    permission: true,
                },
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
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR,
                message: 'auth.error.passwordExpired',
            });
        }

        const safe: AuthLoginSerialization =
            await this.authService.serializationLogin(user);
        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(safe, rememberMe, {
                loginDate,
            });

        const accessToken: string = await this.authService.createAccessToken(
            payloadAccessToken
        );

        return {
            accessToken,
            refreshToken,
        };
    }

    @Response('auth.changePassword')
    @AuthJwtGuard()
    @ErrorMeta(AuthCommonController.name, 'changePassword')
    @Patch('/change-password')
    async changePassword(
        @Body() body: AuthChangePasswordDto,
        @User('_id') _id: string
    ): Promise<void> {
        const user: UserDocument = await this.userService.findOneById(_id);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const matchPassword: boolean = await this.authService.validateUser(
            body.oldPassword,
            user.password
        );
        if (!matchPassword) {
            throw new BadRequestException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NOT_MATCH_ERROR,
                message: 'auth.error.passwordNotMatch',
            });
        }

        const newMatchPassword: boolean = await this.authService.validateUser(
            body.newPassword,
            user.password
        );
        if (newMatchPassword) {
            throw new BadRequestException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NEW_MUST_DIFFERENCE_ERROR,
                message: 'auth.error.newPasswordMustDifference',
            });
        }

        try {
            const password = await this.authService.createPassword(
                body.newPassword
            );

            await this.userService.updatePassword(user._id, password);
        } catch (e) {
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return;
    }
}
