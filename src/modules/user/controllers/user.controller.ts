import {
    BadRequestException,
    Body,
    Controller,
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
import { AuthJwtPayload } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { UploadFileSingle } from 'src/common/file/decorators/file.decorator';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileSizeImagePipe } from 'src/common/file/pipes/file.size.pipe';
import { FileTypeImagePipe } from 'src/common/file/pipes/file.type.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { GetUser } from 'src/modules/user/decorators/user.decorator';
import { UserProfileGuard } from 'src/modules/user/decorators/user.public.decorator';
import {
    UserProfileDoc,
    UserUploadProfileDoc,
} from 'src/modules/user/docs/user.doc';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
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
        private readonly awsService: AwsS3Service
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
}
