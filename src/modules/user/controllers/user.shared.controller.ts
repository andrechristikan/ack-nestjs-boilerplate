import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { ENUM_FILE_MIME_IMAGE } from '@common/file/enums/file.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileTypePipe } from '@common/file/pipes/file.type.pipe';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { IRequestUserAgent } from '@common/request/interfaces/request.interface';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    UserSharedChangePasswordDoc,
    UserSharedGeneratePhotoProfileDoc,
    UserSharedProfileDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadPhotoProfileDoc,
} from '@modules/user/docs/user.shared.doc';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(private readonly userService: UserService) {}

    // TODO: NEXT: Implement this
    //     @AuthSharedRefreshDoc()
    //     @Response('auth.refresh')
    //     @UserProtected()
    //     @AuthJwtRefreshProtected()
    //     @ApiKeyProtected()
    //     @HttpCode(HttpStatus.OK)
    //     @Post('/refresh')
    //     async refresh(
    //         @AuthJwtToken() refreshToken: string,
    //         @AuthJwtPayload<IAuthJwtRefreshTokenPayload>()
    //         { user: userFromPayload, session }: IAuthJwtRefreshTokenPayload
    //     ): Promise<IResponse<AuthRefreshResponseDto>> {
    //         const checkActive = await this.sessionService.findLoginSession(session);
    //         if (!checkActive) {
    //             throw new UnauthorizedException({
    //                 statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
    //                 message: 'session.error.notFound',
    //             });
    //         }

    //         const user: IUserDoc =
    //             await this.userService.findOneActiveById(userFromPayload);
    //         const token = this.authService.refreshToken(user, refreshToken);

    //         return {
    //             data: token,
    //         };
    //     }

    @UserSharedProfileDoc()
    @Response('user.profile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload('userId')
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        return this.userService.getProfile(userId);
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body()
        data: UserUpdateProfileRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<void>> {
        return this.userService.updateProfile(userId, data, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedGeneratePhotoProfileDoc()
    @Response('user.uploadPhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/profile/update/photo/presign')
    async generatePhotoProfilePresign(
        @AuthJwtPayload('userId')
        userId: string,
        @Body() data: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.userService.generatePhotoProfilePresign(userId, data);
    }

    @UserSharedUpdatePhotoProfileDoc()
    @Response('user.updatePhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update/photo')
    async updatePhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body() body: UserUpdateProfilePhotoRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<void>> {
        return this.userService.updatePhotoProfile(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedUploadPhotoProfileDoc()
    @Response('user.uploadPhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @FileUploadSingle()
    @Post('/profile/upload/photo')
    async uploadPhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body(
            'file',
            new FileTypePipe([
                ENUM_FILE_MIME_IMAGE.JPEG,
                ENUM_FILE_MIME_IMAGE.PNG,
                ENUM_FILE_MIME_IMAGE.JPG,
            ])
        )
        file: IFile,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<void>> {
        return this.userService.uploadPhotoProfile(userId, file, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedChangePasswordDoc()
    @Response('user.changePassword')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: UserChangePasswordRequestDto,
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<void>> {
        return this.userService.changePassword(userId, body, {
            ipAddress,
            userAgent,
        });
    }
}
