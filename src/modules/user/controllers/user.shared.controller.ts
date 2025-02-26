import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { InjectDatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { MessageService } from 'src/common/message/services/message.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import { AwsS3PresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-presign.request.dto';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import {
    UserSharedProfileDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadPhotoProfileDoc,
} from 'src/modules/user/docs/user.shared.doc';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';
import { UserUploadPhotoRequestDto } from 'src/modules/user/dtos/request/user.upload-photo.request.dto';
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
        @InjectDatabaseConnection()
        private readonly databaseConnection: Connection,
        private readonly awsS3Service: AwsS3Service,
        private readonly userService: UserService,
        private readonly countryService: CountryService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService
    ) {}

    @UserSharedProfileDoc()
    @Response('user.profile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('user', UserActiveParsePipe)
        user: IUserDoc
    ): Promise<IResponse<UserProfileResponseDto>> {
        const mapped: UserProfileResponseDto =
            this.userService.mapProfile(user);
        return { data: mapped };
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('user', UserParsePipe)
        user: UserDoc,
        @Body()
        { country, ...body }: UserUpdateProfileRequestDto
    ): Promise<void> {
        const checkCountry = this.countryService.findOneById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.updateProfile(
                user,
                { country, ...body },
                { session }
            );

            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.updateProfile'
                    ),
                },
                { session }
            );

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }

    @UserSharedUploadPhotoProfileDoc()
    @Response('user.uploadPhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload-photo')
    async uploadPhotoProfile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('user', UserParsePipe)
        user: UserDoc,
        @Body() { type }: UserUploadPhotoRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        const randomFilename: string =
            this.userService.createRandomFilenamePhoto(user._id, { type });

        const aws: AwsS3PresignResponseDto =
            await this.awsS3Service.presignPutItem(randomFilename);

        return {
            data: aws,
        };
    }

    @UserSharedUpdatePhotoProfileDoc()
    @Response('user.updatePhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update-photo')
    async updatePhotoProfile(
        @AuthJwtPayload<AuthJwtAccessPayloadDto>('user', UserParsePipe)
        user: UserDoc,
        @Body() body: AwsS3PresignRequestDto
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const aws: AwsS3Dto = this.awsS3Service.mapPresign(body);

            await this.userService.updatePhoto(user, aws, { session });
            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.uploadPhotoProfile'
                    ),
                },
                { session }
            );

            await session.commitTransaction();
            await session.endSession();
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }
}
