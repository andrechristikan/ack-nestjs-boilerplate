import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, HttpStatus, InternalServerErrorException, NotFoundException, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ClientSession, Connection } from 'mongoose';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { ENUM_AUTH_LOGIN_FROM, ENUM_AUTH_LOGIN_WITH } from 'src/common/auth/constants/auth.enum.constant';
import { AuthJwtPayload } from 'src/common/auth/decorators/auth.jwt.decorator';
import { IAuthGooglePayload } from 'src/common/auth/interfaces/auth.interface';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserPublicSignUpDoc } from 'src/modules/user/docs/user.public.doc';
import { UserSignUpDto } from 'src/modules/user/dtos/user.sign-up.dto';
import { UserService } from 'src/modules/user/services/user.service';
import { IUserDoc } from '../interfaces/user.interface';
import { UserDoc } from '../repository/entities/user.entity';
import { UserPayloadSerialization } from '../serializations/user.payload.serialization';
import { AuthGoogleOAuth2LoginProtected, AuthGoogleOAuth2SignUpProtected } from 'src/common/auth/decorators/auth.google.decorator';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { AuthAccessPayloadSerialization } from 'src/common/auth/serializations/auth.access-payload.serialization';
import { AuthRefreshPayloadSerialization } from 'src/common/auth/serializations/auth.refresh-payload.serialization';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService,
        @DatabaseConnection() private readonly databaseConnection: Connection,
    ) {}

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @ApiKeyPublicProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, mobileNumber, ...body }: UserSignUpDto
    ): Promise<void> {
        const promises: Promise<any>[] = [
            this.roleService.findOneByName('user'),
            this.userService.existByEmail(email),
        ];

        if (mobileNumber) {
            promises.push(this.userService.existByMobileNumber(mobileNumber));
        }

        const [role, emailExist, mobileNumberExist] =
            await Promise.all(promises);

        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (mobileNumberExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        const password = await this.authService.createPassword(body.password);

        await this.userService.create(
            {
                email,
                mobileNumber,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.PUBLIC,
                role: role._id,
                ...body,
            },
            password
        );

        return;
    }

    @Response('user.loginGoogle')
    @AuthGoogleOAuth2LoginProtected()
    @Get('/login/google')
    async loginGoogle(): Promise<void> {
        return;
    }

    @Response('user.loginGoogleCallback')
    @AuthGoogleOAuth2LoginProtected()
    @Get('/login/google/callback')
    async loginGoogleCallback(
        @AuthJwtPayload()
        {
            email,
            accessToken: googleAccessToken,
            refreshToken: googleRefreshToken,
        }: IAuthGooglePayload
    ): Promise<IResponse> {
        const user: UserDoc = await this.userService.findOneByEmail(email);

        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        } else if (user.blocked) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_BLOCKED_ERROR,
                message: 'user.error.blocked',
            });
        } else if (user.inactivePermanent) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_PERMANENT_ERROR,
                message: 'user.error.inactivePermanent',
            });
        } else if (!user.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.joinWithRole(
            user
        );
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        await this.userService.updateGoogleSSO(user, {
            accessToken: googleAccessToken,
            refreshToken: googleRefreshToken,
        });

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(userWithRole);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthAccessPayloadSerialization =
            await this.authService.createPayloadAccessToken(payload , {
                loginWith: ENUM_AUTH_LOGIN_WITH.GOOGLE,
                loginFrom:  ENUM_AUTH_LOGIN_FROM.GOOGLE,
                loginDate: new Date()
            });
        const payloadRefreshToken:AuthRefreshPayloadSerialization =
            await this.authService.createPayloadRefreshToken(payload._id, {
                loginWith: ENUM_AUTH_LOGIN_WITH.GOOGLE,
                loginFrom:  ENUM_AUTH_LOGIN_FROM.GOOGLE,
                loginDate: new Date(),
                user
            });

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: any =
            payloadAccessToken;
        let payloadHashedRefreshToken: any =
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
            payloadHashedRefreshToken
        );

        return {
            data: {
                tokenType,
                expiresIn,
                accessToken,
                refreshToken,
            },
        };
    }

    @ApiExcludeEndpoint()
    @Response('user.signUpGoogle')
    @AuthGoogleOAuth2SignUpProtected()
    @Get('/sign-up/google')
    async signUpGoogle(): Promise<void> {
        return;
    }

    @ApiExcludeEndpoint()
    @Response('user.signUpGoogleCallback')
    @AuthGoogleOAuth2SignUpProtected()
    @HttpCode(HttpStatus.CREATED)
    @Get('/sign-up/google/callback')
    async signUpGoogleCallback(
        @AuthJwtPayload()
        {
            email,
            firstName,
            lastName,
            accessToken: googleAccessToken,
            refreshToken: googleRefreshToken,
        }: IAuthGooglePayload
    ): Promise<void> {
        // sign up

        const promises: Promise<any>[] = [
            this.roleService.findOneByName('user'),
            this.userService.existByEmail(email),
        ];

        const [role, emailExist] = await Promise.all(promises);

        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const passwordString =
                await this.authService.createPasswordRandom();
            const password = await this.authService.createPassword(
                passwordString
            );

            const user: UserDoc = await this.userService.create(
                {
                    email,
                    firstName,
                    lastName,
                    password: passwordString,
                    role: role._id,
                    signUpFrom: ENUM_USER_SIGN_UP_FROM.GOOGLE,
                },
                password,
                { session }
            );

            await this.userService.updateGoogleSSO(
                user,
                {
                    accessToken: googleAccessToken,
                    refreshToken: googleRefreshToken,
                },
                { session }
            );

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }
}

