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
    UploadedFile,
    Req,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { ENUM_AUTH_LOGIN_FROM } from 'src/common/auth/constants/auth.enum.constant';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from 'src/common/auth/decorators/auth.social.decorator';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AuthJwtRefreshPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.refresh-payload.dto';
import { AuthSocialApplePayloadDto } from 'src/common/auth/dtos/social/auth.social.apple-payload.dto';
import { AuthSocialGooglePayloadDto } from 'src/common/auth/dtos/social/auth.social.google-payload.dto';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AuthService } from 'src/common/auth/services/auth.service';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import { IAwsS3RandomFilename } from 'src/common/aws/interfaces/aws.interface';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/constants/file.enum.constant';
import { FileUploadSingle } from 'src/common/file/decorators/file.decorator';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileTypePipe } from 'src/common/file/pipes/file.type.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/constants/country.status-code.constant';
import { CountryService } from 'src/modules/country/services/country.service';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import {
    User,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import {
    UserAuthChangePasswordDoc,
    UserAuthLoginCredentialDoc,
    UserAuthLoginSocialAppleDoc,
    UserAuthLoginSocialGoogleDoc,
    UserAuthProfileDoc,
    UserAuthRefreshDoc,
    UserAuthUpdateProfileDoc,
    UserAuthUploadProfileDoc,
} from 'src/modules/user/docs/user.auth.doc';
import { UserChangePasswordRequestDto } from 'src/modules/user/dtos/request/user.change-password.request.dto';
import { UserLoginRequestDto } from 'src/modules/user/dtos/request/user.login.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserLoginResponseDto } from 'src/modules/user/dtos/response/user.login.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserRefreshResponseDto } from 'src/modules/user/dtos/response/user.refresh.response.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserLoginHistoryService } from 'src/modules/user/services/user-login-history.service';
import { UserPasswordHistoryService } from 'src/modules/user/services/user-password-history.service';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.auth.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAuthController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly awsS3Service: AwsS3Service,
        private readonly authService: AuthService,
        private readonly userPasswordHistoryService: UserPasswordHistoryService,
        private readonly countryService: CountryService,
        private readonly userLoginHistoryService: UserLoginHistoryService
    ) {}

    @UserAuthLoginCredentialDoc()
    @Response('user.loginWithCredential')
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body() { email, password }: UserLoginRequestDto,
        @Req() request: Request
    ): Promise<IResponse<UserLoginResponseDto>> {
        let user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean =
            await this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            await this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX_ERROR,
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
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
                data: {
                    attempt: user.passwordAttempt,
                },
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.FORBIDDEN_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.FORBIDDEN_ROLE_INACTIVE_ERROR,
                message: 'user.error.roleInactive',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.resetPasswordAttempt(user, { session });

            const checkPasswordExpired: boolean =
                await this.authService.checkPasswordExpired(
                    user.passwordExpired
                );
            if (checkPasswordExpired) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED_ERROR,
                    message: 'user.error.passwordExpired',
                });
            }

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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
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
        const accessToken: string =
            await this.authService.createAccessToken(payloadAccessToken);

        const payloadRefreshToken: AuthJwtRefreshPayloadDto =
            await this.authService.createPayloadRefreshToken(
                payloadAccessToken
            );
        const refreshToken: string =
            await this.authService.createRefreshToken(payloadRefreshToken);

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

    @UserAuthLoginSocialGoogleDoc()
    @Response('user.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<AuthSocialGooglePayloadDto>()
        { email }: AuthSocialGooglePayloadDto,
        @Req() request: Request
    ): Promise<IResponse<UserLoginResponseDto>> {
        const user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.INACTIVE) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.FORBIDDEN_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.FORBIDDEN_ROLE_INACTIVE_ERROR,
                message: 'user.error.roleInactive',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.resetPasswordAttempt(user, { session });

            const checkPasswordExpired: boolean =
                await this.authService.checkPasswordExpired(
                    user.passwordExpired
                );
            if (checkPasswordExpired) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED_ERROR,
                    message: 'user.error.passwordExpired',
                });
            }

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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
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
        const accessToken: string =
            await this.authService.createAccessToken(payloadAccessToken);

        const payloadRefreshToken: AuthJwtRefreshPayloadDto =
            await this.authService.createPayloadRefreshToken(
                payloadAccessToken
            );
        const refreshToken: string =
            await this.authService.createRefreshToken(payloadRefreshToken);

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

    @UserAuthLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<AuthSocialApplePayloadDto>()
        { email }: AuthSocialApplePayloadDto,
        @Req() request: Request
    ): Promise<IResponse<UserLoginResponseDto>> {
        const user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.INACTIVE) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.FORBIDDEN_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.FORBIDDEN_ROLE_INACTIVE_ERROR,
                message: 'user.error.roleInactive',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.resetPasswordAttempt(user, { session });

            const checkPasswordExpired: boolean =
                await this.authService.checkPasswordExpired(
                    user.passwordExpired
                );
            if (checkPasswordExpired) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED_ERROR,
                    message: 'user.error.passwordExpired',
                });
            }

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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
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
                ENUM_AUTH_LOGIN_FROM.SOCIAL_APPLE
            );
        const accessToken: string =
            await this.authService.createAccessToken(payloadAccessToken);

        const payloadRefreshToken: AuthJwtRefreshPayloadDto =
            await this.authService.createPayloadRefreshToken(
                payloadAccessToken
            );
        const refreshToken: string =
            await this.authService.createRefreshToken(payloadRefreshToken);

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

    @UserAuthRefreshDoc()
    @Response('user.refresh')
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtToken() refreshToken: string,
        @AuthJwtPayload<AuthJwtRefreshPayloadDto>()
        { loginFrom }: AuthJwtRefreshPayloadDto,
        @User() user: IUserDoc
    ): Promise<IResponse<UserRefreshResponseDto>> {
        const roleType = user.role.type;
        const tokenType: string = await this.authService.getTokenType();

        const expiresInAccessToken: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthJwtAccessPayloadDto =
            await this.authService.createPayloadAccessToken(user, loginFrom);
        const accessToken: string =
            await this.authService.createAccessToken(payloadAccessToken);

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

    @UserAuthChangePasswordDoc()
    @Response('user.changePassword')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: UserChangePasswordRequestDto,
        @User() user: UserDoc
    ): Promise<void> {
        const passwordAttempt: boolean =
            await this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            await this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX_ERROR,
                message: 'user.error.passwordAttemptMax',
            });
        }

        const matchPassword: boolean = await this.authService.validateUser(
            body.oldPassword,
            user.password
        );
        if (!matchPassword) {
            await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
            });
        }

        const password: IAuthPassword = await this.authService.createPassword(
            body.newPassword
        );
        const checkUserPassword =
            await this.userPasswordHistoryService.checkPasswordPeriodByUser(
                user,
                password
            );
        if (checkUserPassword) {
            const passwordPeriod =
                await this.userPasswordHistoryService.getPasswordPeriod();
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_MUST_NEW_ERROR,
                message: 'user.error.passwordMustNew',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            period: passwordPeriod,
                        },
                    },
                },
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            user = await this.userService.resetPasswordAttempt(user, {
                session,
            });
            user = await this.userService.updatePassword(user, password, {
                session,
            });
            await this.userPasswordHistoryService.createByUser(user, {
                session,
            });

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }

    @UserAuthProfileDoc()
    @Response('user.profile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/profile')
    async profile(
        @User() user: IUserDoc
    ): Promise<IResponse<UserProfileResponseDto>> {
        const mapped: UserProfileResponseDto =
            await this.userService.mapProfile(user);
        return { data: mapped };
    }

    @UserAuthUpdateProfileDoc()
    @Response('user.updateProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Put('/profile/update')
    async updateProfile(
        @User() user: UserDoc,
        @Body()
        { country, ...body }: UserUpdateRequestDto
    ): Promise<void> {
        const checkCountry = this.countryService.findOneActiveById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'country.error.notFound',
            });
        }

        await this.userService.update(user, { country, ...body });

        return;
    }

    @UserAuthUploadProfileDoc()
    @Response('user.updateProfileUpload')
    @UserProtected()
    @AuthJwtAccessProtected()
    @FileUploadSingle()
    @ApiKeyPublicProtected()
    @Post('/profile/upload')
    async updateProfileUpload(
        @User() user: UserDoc,
        @UploadedFile(
            new FileRequiredPipe(),
            new FileTypePipe([
                ENUM_FILE_MIME_IMAGE.JPG,
                ENUM_FILE_MIME_IMAGE.JPEG,
                ENUM_FILE_MIME_IMAGE.PNG,
            ])
        )
        file: IFile
    ): Promise<void> {
        const pathPrefix: string = await this.userService.getPhotoUploadPath(
            user._id
        );
        const randomFilename: IAwsS3RandomFilename =
            await this.awsS3Service.createRandomFilename(pathPrefix);

        const aws: AwsS3Dto = await this.awsS3Service.putItemInBucket(
            file,
            randomFilename
        );
        await this.userService.updatePhoto(user, aws);

        return;
    }
}
