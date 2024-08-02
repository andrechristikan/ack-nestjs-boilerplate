import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Post,
    Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/constants/auth.enum.constant';
import { AuthJwtPayload } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthSocialGoogleProtected } from 'src/modules/auth/decorators/auth.social.decorator';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthSocialGooglePayloadDto } from 'src/modules/auth/dtos/social/auth.social.google-payload.dto';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import {
    AuthPublicLoginCredentialDoc,
    AuthPublicLoginSocialGoogleDoc,
} from 'src/modules/auth/docs/auth.public.doc';
import { AuthLoginRequestDto } from 'src/modules/auth/dtos/request/auth.login.request.dto';
import { UserService } from 'src/modules/user/services/user.service';
import { UserLoginHistoryService } from 'src/modules/user/services/user-login-history.service';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';

@ApiTags('modules.public.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthPublicController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly userLoginHistoryService: UserLoginHistoryService
    ) {}

    @AuthPublicLoginCredentialDoc()
    @Response('auth.loginWithCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body() { email, password }: AuthLoginRequestDto,
        @Req() request: Request
    ): Promise<IResponse<AuthLoginResponseDto>> {
        let user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean =
            await this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            await this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'user.error.passwordAttemptMax',
            });
        }

        const validate: boolean = await this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            user = await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'user.error.passwordNotMatch',
                data: {
                    attempt: user.passwordAttempt,
                },
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        await this.userService.resetPasswordAttempt(user, { session });

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            await session.abortTransaction();
            await session.endSession();

            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'user.error.passwordExpired',
            });
        }

        try {
            await this.userLoginHistoryService.create(
                request,
                {
                    user: user._id,
                },
                { session }
            );

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        const roleType = userWithRole.role.type;
        const tokenType: string = await this.authService.getTokenType();

        const expiresInAccessToken: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthJwtAccessPayloadDto =
            await this.authService.createPayloadAccessToken(
                userWithRole,
                ENUM_AUTH_LOGIN_FROM.CREDENTIAL
            );
        const accessToken: string = await this.authService.createAccessToken(
            user.email,
            payloadAccessToken
        );

        const payloadRefreshToken: AuthJwtRefreshPayloadDto =
            await this.authService.createPayloadRefreshToken(
                payloadAccessToken
            );
        const refreshToken: string = await this.authService.createRefreshToken(
            user.email,
            payloadRefreshToken
        );

        return {
            data: {
                tokenType,
                roleType,
                expiresIn: expiresInAccessToken,
                accessToken,
                refreshToken,
            },
        };
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('auth.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<AuthSocialGooglePayloadDto>()
        { email }: AuthSocialGooglePayloadDto,
        @Req() request: Request
    ): Promise<IResponse<AuthLoginResponseDto>> {
        const user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.INACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        await this.userService.resetPasswordAttempt(user, { session });

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            await session.abortTransaction();
            await session.endSession();

            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'user.error.passwordExpired',
            });
        }

        try {
            await this.userLoginHistoryService.create(
                request,
                {
                    user: user._id,
                },
                { session }
            );

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        const roleType = userWithRole.role.type;
        const tokenType: string = await this.authService.getTokenType();

        const expiresInAccessToken: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthJwtAccessPayloadDto =
            await this.authService.createPayloadAccessToken(
                userWithRole,
                ENUM_AUTH_LOGIN_FROM.SOCIAL_GOOGLE
            );
        const accessToken: string = await this.authService.createAccessToken(
            user.email,
            payloadAccessToken
        );

        const payloadRefreshToken: AuthJwtRefreshPayloadDto =
            await this.authService.createPayloadRefreshToken(
                payloadAccessToken
            );
        const refreshToken: string = await this.authService.createRefreshToken(
            user.email,
            payloadRefreshToken
        );

        return {
            data: {
                tokenType,
                roleType,
                expiresIn: expiresInAccessToken,
                accessToken,
                refreshToken,
            },
        };
    }
}
