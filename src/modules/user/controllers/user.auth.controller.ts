import {
    BadRequestException,
    Body,
    ConflictException,
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AuthService } from 'src/common/auth/services/auth.service';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileSizeImagePipe } from 'src/common/file/pipes/file.size.pipe';
import { FileTypeImagePipe } from 'src/common/file/pipes/file.type.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { SettingService } from 'src/common/setting/services/setting.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import {
    GetUser,
    UserAuthProtected,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import {
    UserAuthChangePasswordDoc,
    UserAuthClaimUsernameDoc,
    UserAuthLoginGoogleDoc,
    UserAuthInfoDoc,
    UserAuthLoginDoc,
    UserAuthProfileDoc,
    UserAuthRefreshDoc,
    UserAuthUpdateProfileDoc,
    UserAuthUploadProfileDoc,
} from 'src/modules/user/docs/user.auth.doc';
import { UserChangePasswordDto } from 'src/modules/user/dtos/user.change-password.dto';
import { UserUpdateNameDto } from 'src/modules/user/dtos/user.update-name.dto';
import { UserUpdateUsernameDto } from 'src/modules/user/dtos/user.update-username.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';
import { UserService } from 'src/modules/user/services/user.service';
import { UserRefreshSerialization } from 'src/modules/user/serializations/user.refresh.serialization';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserLoginDto } from 'src/modules/user/dtos/user.login.dto';
import {
    ENUM_AUTH_LOGIN_FROM,
    ENUM_AUTH_LOGIN_WITH,
} from 'src/common/auth/constants/auth.enum.constant';
import { AuthRefreshPayloadSerialization } from 'src/common/auth/serializations/auth.refresh-payload.serialization';
import { AuthAccessPayloadSerialization } from 'src/common/auth/serializations/auth.access-payload.serialization';
import { AuthGooglePayloadSerialization } from 'src/common/auth/serializations/auth.google-payload.serialization';
import { AuthGoogleOAuth2Protected } from 'src/common/auth/decorators/auth.google.decorator';
import { ClientSession, Connection } from 'mongoose';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { FileUploadSingle } from 'src/common/file/decorators/file.decorator';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';

@ApiTags('modules.auth.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAuthController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly settingService: SettingService,
        private readonly awsS3Service: AwsS3Service
    ) {}

    @UserAuthLoginDoc()
    @Response('user.login', {
        serialization: UserLoginSerialization,
    })
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(@Body() { email, password }: UserLoginDto): Promise<IResponse> {
        const user: UserDoc = await this.userService.findOneByEmail(email);
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
            await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
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

        const userWithRole: IUserDoc =
            await this.userService.joinWithRole(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(userWithRole);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const loginDate: Date = await this.authService.getLoginDate();
        const payloadAccessToken: AuthAccessPayloadSerialization =
            await this.authService.createPayloadAccessToken(payload, {
                loginWith: ENUM_AUTH_LOGIN_WITH.EMAIL,
                loginFrom: ENUM_AUTH_LOGIN_FROM.PASSWORD,
                loginDate,
            });
        const payloadRefreshToken: AuthRefreshPayloadSerialization =
            await this.authService.createPayloadRefreshToken(
                payload._id,
                payloadAccessToken
            );

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: AuthAccessPayloadSerialization | string =
            payloadAccessToken;
        let payloadHashedRefreshToken:
            | AuthRefreshPayloadSerialization
            | string = payloadRefreshToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
            payloadHashedRefreshToken =
                await this.authService.encryptRefreshToken(payloadRefreshToken);
        }

        const roleType = userWithRole.role.type;
        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );
        const refreshToken: string = await this.authService.createRefreshToken(
            payloadHashedRefreshToken
        );

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);

        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR,
                message: 'user.error.passwordExpired',
            });
        }

        return {
            data: {
                tokenType,
                roleType,
                expiresIn,
                accessToken,
                refreshToken,
            },
        };
    }

    @UserAuthLoginGoogleDoc()
    @Response('user.loginGoogle')
    @AuthGoogleOAuth2Protected()
    @ApiKeyPublicProtected()
    @Get('/login/google')
    async loginGoogle(
        @AuthJwtPayload<AuthGooglePayloadSerialization>()
        { user: userPayload }: AuthGooglePayloadSerialization
    ): Promise<IResponse> {
        const user: UserDoc = await this.userService.findOneByEmail(
            userPayload.email
        );

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

        const userWithRole: IUserDoc =
            await this.userService.joinWithRole(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(userWithRole);
        const tokenType: string = await this.authService.getTokenType();
        const loginDate: Date = await this.authService.getLoginDate();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthAccessPayloadSerialization =
            await this.authService.createPayloadAccessToken(payload, {
                loginWith: ENUM_AUTH_LOGIN_WITH.EMAIL,
                loginFrom: ENUM_AUTH_LOGIN_FROM.PASSWORD,
                loginDate,
            });
        const payloadRefreshToken: AuthRefreshPayloadSerialization =
            await this.authService.createPayloadRefreshToken(
                payload._id,
                payloadAccessToken
            );

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: AuthAccessPayloadSerialization | string =
            payloadAccessToken;
        let payloadHashedRefreshToken:
            | AuthRefreshPayloadSerialization
            | string = payloadRefreshToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
            payloadHashedRefreshToken =
                await this.authService.encryptRefreshToken(payloadRefreshToken);
        }

        const roleType = userWithRole.role.type;
        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );
        const refreshToken: string = await this.authService.createRefreshToken(
            payloadHashedRefreshToken
        );

        return {
            data: {
                tokenType,
                roleType,
                expiresIn,
                accessToken,
                refreshToken,
            },
        };
    }

    @UserAuthRefreshDoc()
    @Response('user.refresh', { serialization: UserRefreshSerialization })
    @UserAuthProtected()
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtToken() refreshToken: string,
        @AuthJwtPayload<AuthRefreshPayloadSerialization>()
        refreshPayload: AuthRefreshPayloadSerialization,
        @GetUser() user: UserDoc
    ): Promise<IResponse> {
        const userWithRole: IUserDoc =
            await this.userService.joinWithRole(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR,
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

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(userWithRole);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: AuthAccessPayloadSerialization =
            await this.authService.createPayloadAccessToken(payload, {
                loginDate: refreshPayload.loginDate,
                loginFrom: refreshPayload.loginFrom,
                loginWith: refreshPayload.loginWith,
            });

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: AuthAccessPayloadSerialization | string =
            payloadAccessToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
        }

        const roleType = userWithRole.role.type;
        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );

        return {
            data: {
                tokenType,
                roleType,
                expiresIn,
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
        @Body() body: UserChangePasswordDto,
        @GetUser() user: UserDoc
    ): Promise<void> {
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
            await this.userService.increasePasswordAttempt(user);

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

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.resetPasswordAttempt(user, { session });

            const password: IAuthPassword =
                await this.authService.createPassword(body.newPassword);

            await this.userService.updatePassword(user, password, { session });

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

    @UserAuthInfoDoc()
    @Response('user.info', { serialization: AuthAccessPayloadSerialization })
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/info')
    async info(
        @AuthJwtPayload<AuthAccessPayloadSerialization>()
        payload: AuthAccessPayloadSerialization
    ): Promise<IResponse> {
        return { data: payload };
    }

    @UserAuthProfileDoc()
    @Response('user.profile', {
        serialization: UserProfileSerialization,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/profile')
    async profile(@GetUser() user: UserDoc): Promise<IResponse> {
        const userWithRole: IUserDoc =
            await this.userService.joinWithRole(user);
        return { data: userWithRole.toObject() };
    }

    @UserAuthUpdateProfileDoc()
    @Response('user.updateProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/profile/update')
    async updateProfile(
        @GetUser() user: UserDoc,
        @Body() body: UserUpdateNameDto
    ): Promise<void> {
        await this.userService.updateName(user, body);

        return;
    }

    @UserAuthClaimUsernameDoc()
    @Response('user.claimUsername')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/profile/claim-username')
    async claimUsername(
        @GetUser() user: UserDoc,
        @Body() { username }: UserUpdateUsernameDto
    ): Promise<void> {
        const checkUsername: boolean =
            await this.userService.existByUsername(username);
        if (checkUsername) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR,
                message: 'user.error.usernameExist',
            });
        }

        await this.userService.updateUsername(user, { username });

        return;
    }

    @UserAuthUploadProfileDoc()
    @Response('user.upload')
    @UserProtected()
    @AuthJwtAccessProtected()
    @FileUploadSingle()
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload')
    async upload(
        @GetUser() user: UserDoc,
        @UploadedFile(FileRequiredPipe, FileSizeImagePipe, FileTypeImagePipe)
        file: IFile
    ): Promise<void> {
        const filename: string = file.originalname;
        const content: Buffer = file.buffer;
        const mime: string = filename
            .substring(filename.lastIndexOf('.') + 1, filename.length)
            .toLowerCase();

        const path = await this.userService.createPhotoFilename();

        const aws: AwsS3Serialization = await this.awsS3Service.putItemInBucket(
            `${path.filename}.${mime}`,
            content,
            {
                path: `${path.path}/${user._id}`,
            }
        );
        await this.userService.updatePhoto(user, aws);

        return;
    }
}
