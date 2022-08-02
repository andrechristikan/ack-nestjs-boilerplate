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
import {
    AuthJwtGuard,
    AuthRefreshJwtGuard,
    Token,
    User,
} from 'src/common/auth/auth.decorator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { UploadFileSingle } from 'src/common/file/file.decorator';
import { IFile } from 'src/common/file/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileSizePipe } from 'src/common/file/pipes/file.size.pipe';
import { FileTypeImagePipe } from 'src/common/file/pipes/file.type.pipe';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.constant';
import { Logger } from 'src/common/logger/logger.decorator';
import { Response } from 'src/common/response/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { IAwsS3Response } from 'src/modules/aws/aws.interface';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import {
    ENUM_USER_STATUS_CODE_ERROR,
    ENUM_USER_STATUS_CODE_SUCCESS,
} from '../constants/user.status-code.constant';
import { UserChangePasswordDto } from '../dtos/user.change-password.dto';
import { UserLoginDto } from '../dtos/user.login.dto';
import { UserDocument } from '../schemas/user.schema';
import { UserLoginSerialization } from '../serializations/user.login.serialization';
import { UserService } from '../services/user.service';
import { GetUser, UserProfileGuard } from '../user.decorator';
import { IUserDocument } from '../user.interface';

@Controller({
    version: '1',
    path: '/user',
})
export class UserController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly awsService: AwsS3Service
    ) {}

    @Response('user.profile')
    @UserProfileGuard()
    @AuthJwtGuard()
    @Get('/profile')
    async profile(@GetUser() user: IUserDocument): Promise<IResponse> {
        return this.userService.serializationProfile(user);
    }

    @Response('user.upload')
    @UserProfileGuard()
    @AuthJwtGuard()
    @UploadFileSingle('file')
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload')
    async upload(
        @GetUser() user: IUserDocument,
        @UploadedFile(FileRequiredPipe, FileSizePipe, FileTypeImagePipe)
        file: IFile
    ): Promise<void> {
        const filename: string = file.originalname;
        const content: Buffer = file.buffer;
        const mime: string = filename
            .substring(filename.lastIndexOf('.') + 1, filename.length)
            .toUpperCase();

        const path = await this.userService.createRandomFilename();

        try {
            const aws: IAwsS3Response = await this.awsService.putItemInBucket(
                `${path.filename}.${mime}`,
                content,
                {
                    path: `${path.path}/${user._id}`,
                }
            );

            await this.userService.updatePhoto(user._id, aws);
        } catch (err) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                cause: err.message,
            });
        }

        return;
    }

    @Response('user.changePassword')
    @AuthJwtGuard()
    @Patch('/change-password')
    async changePassword(
        @Body() body: UserChangePasswordDto,
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
                cause: err.message,
            });
        }

        return;
    }

    @Response('user.login')
    @Logger(ENUM_LOGGER_ACTION.LOGIN, { tags: ['login', 'withEmail'] })
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(@Body() body: UserLoginDto): Promise<IResponse> {
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

        const safe: UserLoginSerialization =
            await this.userService.serializationLogin(user);

        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(safe, rememberMe);
        const payloadRefreshToken: Record<string, any> =
            await this.authService.createPayloadRefreshToken(
                safe._id,
                rememberMe,
                {
                    loginDate: payloadAccessToken.loginDate,
                }
            );

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
            return {
                metadata: {
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR,
                    message: 'user.error.passwordExpired',
                },
                accessToken,
                refreshToken,
            };
        }

        return {
            metadata: {
                statusCode: ENUM_USER_STATUS_CODE_SUCCESS.USER_LOGIN_SUCCESS,
            },
            accessToken,
            refreshToken,
        };
    }

    @Response('user.refresh')
    @AuthRefreshJwtGuard()
    @HttpCode(HttpStatus.OK)
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
                    ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR,
                message: 'user.error.passwordExpired',
            });
        }

        const safe: UserLoginSerialization =
            await this.userService.serializationLogin(user);
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
}
