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
import { ClientSession } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MessageService } from '@common/message/services/message.service';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponse } from '@common/response/interfaces/response.interface';
import { ActivityService } from '@modules/activity/services/activity.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';
import { AwsS3PresignResponseDto } from '@modules/aws/dtos/response/aws.s3-presign.response.dto';
import { AwsS3Service } from '@modules/aws/services/aws.s3.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@modules/country/enums/country.status-code.enum';
import { CountryService } from '@modules/country/services/country.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    UserSharedProfileDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadPhotoProfileDoc,
} from '@modules/user/docs/user.shared.doc';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { IUserDoc } from '@modules/user/interfaces/user.interface';
import {
    UserActiveParsePipe,
    UserParsePipe,
} from '@modules/user/pipes/user.parse.pipe';
import { UserDoc } from '@modules/user/repository/entities/user.entity';
import { UserService } from '@modules/user/services/user.service';
import { SessionJtiProtected } from '@modules/session/decorators/session.jti.decorator';
import { UserUploadPhotoProfileRequestDto } from '@modules/user/dtos/request/user.upload-photo-profile.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly awsS3Service: AwsS3Service,
        private readonly userService: UserService,
        private readonly countryService: CountryService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService
    ) {}

    @UserSharedProfileDoc()
    @Response('user.profile')
    @TermPolicyAcceptanceProtected(ENUM_TERM_POLICY_TYPE.PRIVACY)
    @SessionJtiProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: IUserDoc
    ): Promise<IResponse<UserProfileResponseDto>> {
        const mapped: UserProfileResponseDto =
            this.userService.mapProfile(user);
        return { data: mapped };
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @SessionJtiProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
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
            await this.databaseService.createTransaction();

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

            await this.databaseService.commitTransaction(session);
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
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
    @Post('/upload/photo-profile')
    async uploadPhotoProfile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserDoc,
        @Body() { mime, size }: UserUploadPhotoProfileRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        const randomFilename: string =
            this.userService.createRandomFilenamePhoto(user._id, {
                mime,
                size,
            });

        const aws: AwsS3PresignResponseDto =
            await this.awsS3Service.presignPutItem(randomFilename, size, {
                forceUpdate: true,
            });

        return {
            data: aws,
        };
    }

    @UserSharedUpdatePhotoProfileDoc()
    @Response('user.updatePhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/photo-profile')
    async updatePhotoProfile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserDoc,
        @Body() body: AwsS3PresignRequestDto
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseService.createTransaction();

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

            await this.databaseService.commitTransaction(session);
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }
}
