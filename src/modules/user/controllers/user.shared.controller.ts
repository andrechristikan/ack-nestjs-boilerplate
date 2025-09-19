import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
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
    UserSharedGeneratePhotoProfileDoc,
    UserSharedProfileDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
} from '@modules/user/docs/user.shared.doc';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdatePhotoProfileResponseDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
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

    @UserSharedProfileDoc()
    @Response('user.profile')
    // @TermPolicyAcceptanceProtected(ENUM_TERM_POLICY_TYPE.PRIVACY) // TODO: NEED TO ENABLE THIS
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
    // @TermPolicyAcceptanceProtected(ENUM_TERM_POLICY_TYPE.PRIVACY) // TODO: NEED TO ENABLE THIS
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
    ): Promise<void> {
        return this.userService.updateProfile(userId, data, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedGeneratePhotoProfileDoc()
    @Response('user.uploadPhotoProfile')
    // @TermPolicyAcceptanceProtected(ENUM_TERM_POLICY_TYPE.PRIVACY) // TODO: NEED TO ENABLE THIS
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/profile/generate/photo-presign')
    async uploadPhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body() data: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.userService.generatePhotoProfilePresign(userId, data);
    }

    @UserSharedUpdatePhotoProfileDoc()
    @Response('user.updatePhotoProfile')
    // @TermPolicyAcceptanceProtected(ENUM_TERM_POLICY_TYPE.PRIVACY) // TODO: NEED TO ENABLE THIS
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update/photo')
    async updatePhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body() body: UserUpdatePhotoProfileResponseDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<void> {
        return this.userService.updatePhotoProfile(userId, body, {
            ipAddress,
            userAgent,
        });
    }
}
