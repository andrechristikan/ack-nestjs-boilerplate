import { Controller, Get, Post, UploadedFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileUploadSingle } from 'src/common/file/decorators/file.decorator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/enums/file.enum';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileTypePipe } from 'src/common/file/pipes/file.type.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import {
    UserSharedProfileDoc,
    UserSharedUploadProfileDoc,
} from 'src/modules/user/docs/user.shared.doc';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly userService: UserService
    ) {}

    // TODO: UPDATE PROFILE
    @UserSharedProfileDoc()
    @Response('user.profile')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>()
        { _id }: AuthJwtAccessPayloadDto
    ): Promise<IResponse<UserProfileResponseDto>> {
        const user = await this.userService.findOneWithRoleAndCountryById(_id);

        const mapped: UserProfileResponseDto =
            await this.userService.mapProfile(user);
        return { data: mapped };
    }

    @UserSharedUploadProfileDoc()
    @Response('user.updateProfileUpload')
    @AuthJwtAccessProtected()
    @FileUploadSingle()
    @ApiKeyProtected()
    @Post('/profile/upload')
    async updateProfileUpload(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>()
        { _id }: AuthJwtAccessPayloadDto,
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
        const user = await this.userService.findOneById(_id);
        const path: string = await this.userService.getPhotoUploadPath(
            user._id
        );
        const randomFilename: string =
            await this.userService.createRandomFilenamePhoto();

        const aws: AwsS3Dto = await this.awsS3Service.putItemInBucket(file, {
            customFilename: randomFilename,
            path,
        });
        await this.userService.updatePhoto(user, aws);

        return;
    }
}
