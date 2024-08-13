import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Post,
    Put,
    UploadedFile,
} from '@nestjs/common';
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
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
import {
    UserSharedProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadProfileDoc,
} from 'src/modules/user/docs/user.shared.doc';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import {
    UserActiveParsePipe,
    UserParsePipe,
} from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly userService: UserService,
        private readonly countryService: CountryService
    ) {}

    @UserSharedProfileDoc()
    @Response('user.profile')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('_id', UserActiveParsePipe)
        user: IUserDoc
    ): Promise<IResponse<UserProfileResponseDto>> {
        const mapped: UserProfileResponseDto =
            await this.userService.mapProfile(user);
        return { data: mapped };
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('_id', UserParsePipe)
        user: UserDoc,
        @Body()
        { country, ...body }: UserUpdateProfileRequestDto
    ): Promise<void> {
        const checkCountry = this.countryService.findOneActiveById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        await this.userService.updateProfile(user, { country, ...body });

        return;
    }

    @UserSharedUploadProfileDoc()
    @Response('user.updateProfileUpload')
    @AuthJwtAccessProtected()
    @FileUploadSingle()
    @ApiKeyProtected()
    @Post('/profile/upload')
    async updateProfileUpload(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('_id', UserParsePipe)
        user: UserDoc,
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
