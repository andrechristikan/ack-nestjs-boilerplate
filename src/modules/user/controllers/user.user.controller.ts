import {
    Body,
    ConflictException,
    Controller,
    Delete,
    InternalServerErrorException,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { UserService } from 'src/modules/user/services/user.service';
import {
    UserUserDeleteDoc,
    UserUserUpdateMobileNumberDoc,
    UserUserUpdateUsernameDoc,
} from 'src/modules/user/docs/user.user.doc';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdateClaimUsernameRequestDto } from 'src/modules/user/dtos/request/user.update-claim-username.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { InjectDatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ClientSession, Connection } from 'mongoose';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { MessageService } from 'src/common/message/services/message.service';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { SessionService } from 'src/modules/session/services/session.service';
import { POLICY_ROLE_TYPE_USER_GROUP } from 'src/modules/policy/constants/policy.constant';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(
        @InjectDatabaseConnection()
        private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService,
        private readonly sessionService: SessionService
    ) {}

    @UserUserDeleteDoc()
    @Response('user.delete')
    @PolicyRoleProtected(...POLICY_ROLE_TYPE_USER_GROUP)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete')
    async delete(
        @AuthJwtPayload('_id', UserParsePipe) user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.softDelete(
                user,
                { deletedBy: user._id },
                { session }
            );

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

    @UserUserUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @PolicyRoleProtected(...POLICY_ROLE_TYPE_USER_GROUP)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/mobile-number')
    async updateMobileNumber(
        @AuthJwtPayload('_id', UserParsePipe) user: UserDoc,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.updateMobileNumber(user, body, { session });

            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.updateMobileNumber'
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

    @UserUserUpdateUsernameDoc()
    @Response('user.updateClaimUsername')
    @PolicyRoleProtected(...POLICY_ROLE_TYPE_USER_GROUP)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/claim-username')
    async updateUsername(
        @AuthJwtPayload('_id', UserParsePipe) user: UserDoc,
        @Body()
        { username }: UserUpdateClaimUsernameRequestDto
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const checkUsername =
                await this.userService.existByUsername(username);
            if (checkUsername) {
                throw new ConflictException({
                    statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_EXIST,
                    message: 'user.error.usernameExist',
                });
            }

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
