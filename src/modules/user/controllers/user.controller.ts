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
import { AuthService } from 'src/common/auth/services/auth.service';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { UploadFileSingle } from 'src/common/file/decorators/file.decorator';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileSizeImagePipe } from 'src/common/file/pipes/file.size.pipe';
import { FileTypeImagePipe } from 'src/common/file/pipes/file.type.pipe';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.enum.constant';
import { Logger } from 'src/common/logger/decorators/logger.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { SettingService } from 'src/common/setting/services/setting.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { GetUser } from 'src/modules/user/decorators/user.decorator';
import { UserProfileGuard } from 'src/modules/user/decorators/user.public.decorator';
import {
    UserChangePasswordDoc,
    UserInfoDoc,
    UserLoginDoc,
    UserProfileDoc,
    UserRefreshDoc,
    UserUploadProfileDoc,
} from 'src/modules/user/docs/user.doc';
import { UserChangePasswordDto } from 'src/modules/user/dtos/user.change-password.dto';
import { UserLoginDto } from 'src/modules/user/dtos/user.login.dto';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserInfoSerialization } from 'src/modules/user/serializations/user.info.serialization';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly awsService: AwsS3Service,
        private readonly settingService: SettingService
    ) {}

    @UserProfileDoc()
    @Response('user.profile', {
        serialization: UserProfileSerialization,
    })
    @UserProfileGuard()
    @AuthJwtAccessProtected()
    @Get('/profile')
    async profile(@GetUser() user: IUserEntity): Promise<IResponse> {
        return user;
    }

    @UserUploadProfileDoc()
    @Response('user.upload')
    @UserProfileGuard()
    @AuthJwtAccessProtected()
    @UploadFileSingle('file')
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload')
    async upload(
        @GetUser() user: IUserEntity,
        @UploadedFile(FileRequiredPipe, FileSizeImagePipe, FileTypeImagePipe)
        file: IFile
    ): Promise<void> {
        const filename: string = file.originalname;
        const content: Buffer = file.buffer;
        const mime: string = filename
            .substring(filename.lastIndexOf('.') + 1, filename.length)
            .toUpperCase();

        const path = await this.userService.createRandomFilename();

        try {
            const aws: AwsS3Serialization =
                await this.awsService.putItemInBucket(
                    `${path.filename}.${mime}`,
                    content,
                    {
                        path: `${path.path}/${user._id}`,
                    }
                );

            await this.userService.updatePhoto(user._id, aws);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @UserChangePasswordDoc()
    @Response('user.changePassword')
    @AuthJwtAccessProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: UserChangePasswordDto,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const user: UserEntity = await this.userService.findOneById(_id);
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

        try {
            const password = await this.authService.createPassword(
                body.newPassword
            );

            await this.userService.updatePassword(user._id, password);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @UserLoginDoc()
    @Response('user.login', {
        serialization: UserLoginSerialization,
    })
    @Logger(ENUM_LOGGER_ACTION.LOGIN, { tags: ['login', 'withEmail'] })
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Body() { password, username, rememberMe }: UserLoginDto
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

        if (passwordAttempt) {
            const maxPasswordAttempt: number =
                await this.settingService.getMaxPasswordAttempt();

            if (user.passwordAttempt >= maxPasswordAttempt) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_ATTEMPT_MAX_ERROR,
                    message: 'user.error.passwordAttemptMax',
                });
            }
        }

        const validate: boolean = await this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            await this.userService.increasePasswordAttempt(user._id);

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

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(user);
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

    @UserRefreshDoc()
    @Response('user.refresh', { serialization: UserLoginSerialization })
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

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(user);
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

    @UserInfoDoc()
    @Response('user.info', { serialization: UserInfoSerialization })
    @AuthJwtAccessProtected()
    @Get('/info')
    async info(
        @AuthJwtPayload() user: Record<string, any>
    ): Promise<IResponse> {
        return user;
    }
}
