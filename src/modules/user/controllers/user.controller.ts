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
    Req,
    UploadedFile,
} from '@nestjs/common';
import { Token, User } from 'src/common/auth/decorators/auth.decorator';
import {
    AuthJwtGuard,
    AuthRefreshJwtGuard,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { IAwsS3 } from 'src/common/aws/aws.interface';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { UploadFileSingle } from 'src/common/file/decorators/file.decorator';
import { IFile } from 'src/common/file/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileSizeImagePipe } from 'src/common/file/pipes/file.size.pipe';
import { FileTypeImagePipe } from 'src/common/file/pipes/file.type.pipe';
import { ENUM_LOGGER_ACTION } from 'src/common/logger/constants/logger.enum.constant';
import { Logger } from 'src/common/logger/decorators/logger.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/response.interface';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import {
    ENUM_USER_STATUS_CODE_ERROR,
    ENUM_USER_STATUS_CODE_SUCCESS,
} from '../constants/user.status-code.constant';
import { GetUser } from '../decorators/user.decorator';
import { UserProfileGuard } from '../decorators/user.public.decorator';
import { UserChangePasswordDto } from '../dtos/user.change-password.dto';
import { UserLoginDto } from '../dtos/user.login.dto';
import { UserDocument } from '../schemas/user.schema';
import { UserLoginSerialization } from '../serializations/user.login.serialization';
import { UserPayloadSerialization } from '../serializations/user.payload.serialization';
import { UserProfileSerialization } from '../serializations/user.profile.serialization';
import { UserService } from '../services/user.service';
import { IUserDocument } from '../user.interface';
import { IRequestApp } from '../../../common/request/request.interface';

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

    @Response('user.profile', {
        classSerialization: UserProfileSerialization,
    })
    @UserProfileGuard()
    @AuthJwtGuard()
    @Get('/profile')
    async profile(@GetUser() user: IUserDocument): Promise<IResponse> {
        return user;
    }

    @Response('user.upload')
    @UserProfileGuard()
    @AuthJwtGuard()
    @UploadFileSingle('file')
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload')
    async upload(
        @GetUser() user: IUserDocument,
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
            const aws: IAwsS3 = await this.awsService.putItemInBucket(
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
                error: err.message,
            });
        }

        return;
    }

    @Response('user.login', { classSerialization: UserLoginSerialization })
    @Logger(ENUM_LOGGER_ACTION.LOGIN, { tags: ['login', 'withEmail'] })
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(
        @Req() { hostname }: IRequestApp,
        @Body() body: UserLoginDto
    ): Promise<IResponse> {
        const rememberMe: boolean = body.rememberMe ? true : false;
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: string =
            await this.authService.getAccessTokenExpirationTime();
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

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(user);
        const scope: string = await this.authService.getScope(payload);
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

        const accessToken: string = await this.authService.createAccessToken(
            payloadAccessToken,
            { audience: hostname }
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payloadRefreshToken,
            { rememberMe, audience: hostname }
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
            metadata: {
                // override status code
                statusCode: ENUM_USER_STATUS_CODE_SUCCESS.USER_LOGIN_SUCCESS,
            },
            scope,
            tokenType,
            expiresIn,
            accessToken,
            refreshToken,
        };
    }

    @Response('user.refresh')
    @AuthRefreshJwtGuard()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @Req() { hostname }: IRequestApp,
        @User()
        { _id, rememberMe, loginDate }: Record<string, any>,
        @Token() refreshToken: string
    ): Promise<IResponse> {
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: string =
            await this.authService.getAccessTokenExpirationTime();
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

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(user);
        const scope: string = await this.authService.getScope(payload);
        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(
                payload,
                rememberMe,
                {
                    loginDate,
                }
            );

        const accessToken: string = await this.authService.createAccessToken(
            payloadAccessToken,
            { audience: hostname }
        );

        return {
            tokenType,
            scope,
            expiresIn,
            accessToken,
            refreshToken,
        };
    }
}
