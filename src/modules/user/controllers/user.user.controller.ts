import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Delete,
    InternalServerErrorException,
    NotFoundException,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from '@module/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@module/auth/decorators/auth.jwt.decorator';
import { PolicyRoleProtected } from '@module/policy/decorators/policy.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { UserService } from '@module/user/services/user.service';
import {
    UserUserDeleteDoc,
    UserUserUpdateMobileNumberDoc,
    UserUserUpdateUsernameDoc,
} from '@module/user/docs/user.user.doc';
import { UserUpdateMobileNumberRequestDto } from '@module/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdateClaimUsernameRequestDto } from '@module/user/dtos/request/user.update-claim-username.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from '@module/user/enums/user.status-code.enum';
import { UserParsePipe } from '@module/user/pipes/user.parse.pipe';
import { UserDoc } from '@module/user/repository/entities/user.entity';
import { ClientSession } from 'mongoose';
import { ActivityService } from '@module/activity/services/activity.service';
import { MessageService } from '@common/message/services/message.service';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { SessionService } from '@module/session/services/session.service';
import { ENUM_POLICY_ROLE_TYPE } from '@module/policy/enums/policy.enum';
import { CountryService } from '@module/country/services/country.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@module/country/enums/country.status-code.enum';
import { UserProtected } from '@module/user/decorators/user.decorator';
import { DatabaseService } from '@common/database/services/database.service';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly userService: UserService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService,
        private readonly sessionService: SessionService,
        private readonly countryService: CountryService
    ) {}

    @UserUserDeleteDoc()
    @Response('user.delete')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete')
    async delete(
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.userService.softDelete(user, {
                session,
                actionBy: user._id,
            });

            await this.activityService.createByUser(
                user,
                {
                    description:
                        this.messageService.setMessage('activity.delete'),
                },
                { session }
            );

            await this.sessionService.updateManyRevokeByUser(user._id, {
                session,
            });

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

    @UserUserUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/mobile-number')
    async updateMobileNumber(
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc,
        @Body()
        { number, country }: UserUpdateMobileNumberRequestDto
    ): Promise<void> {
        const checkCountry = await this.countryService.findOneById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        const checkValidMobileNumber = this.userService.checkMobileNumber(
            number,
            checkCountry
        );
        if (!checkValidMobileNumber) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_INVALID,
                message: 'user.error.mobileNumberInvalid',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.userService.updateMobileNumber(
                user,
                { number, country },
                { session }
            );
            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.updateMobileNumber'
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

    @UserUserUpdateUsernameDoc()
    @Response('user.updateClaimUsername')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/claim-username')
    async updateUsername(
        @AuthJwtPayload('user', UserParsePipe) user: UserDoc,
        @Body()
        { username }: UserUpdateClaimUsernameRequestDto
    ): Promise<void> {
        const checkUsername = this.userService.checkUsernamePattern(username);
        if (checkUsername) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_NOT_ALLOWED,
                message: 'user.error.usernameNotAllowed',
            });
        }

        const checkBadWord =
            await this.userService.checkUsernameBadWord(username);
        if (checkBadWord) {
            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USERNAME_CONTAIN_BAD_WORD,
                message: 'user.error.usernameContainBadWord',
            });
        }

        const exist = await this.userService.existByUsername(username);
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_EXIST,
                message: 'user.error.usernameExist',
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            await this.userService.updateClaimUsername(
                user,
                { username },
                { session }
            );

            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.updateClaimUsername'
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
