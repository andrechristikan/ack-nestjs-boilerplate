import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Patch,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession } from 'mongoose';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthService } from '@modules/auth/services/auth.service';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponse } from '@common/response/interfaces/response.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { UserService } from '@modules/user/services/user.service';
import { AuthRefreshResponseDto } from '@modules/auth/dtos/response/auth.refresh.response.dto';
import { AuthChangePasswordRequestDto } from '@modules/auth/dtos/request/auth.change-password.request.dto';
import {
    AuthSharedChangePasswordDoc,
    AuthSharedRefreshDoc,
} from '@modules/auth/docs/auth.shared.doc';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';
import { Queue } from 'bullmq';
import { ENUM_PASSWORD_HISTORY_TYPE } from '@modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { SessionService } from '@modules/session/services/session.service';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
import { ActivityService } from '@modules/activity/services/activity.service';
import { MessageService } from '@common/message/services/message.service';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { IUserDoc } from '@modules/user/interfaces/user.interface';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { DatabaseService } from '@common/database/services/database.service';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { v4 as uuidV4 } from 'uuid';
import { SessionJtiProtected } from '@modules/session/decorators/session.jti.decorator';

@ApiTags('modules.shared.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthSharedController {
    constructor(
        private readonly databaseService: DatabaseService,
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService
    ) {}

    @AuthSharedRefreshDoc()
    @Response('auth.refresh')
    @SessionJtiProtected()
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtToken() refreshToken: string,
        @AuthJwtPayload<IAuthJwtRefreshTokenPayload>()
        {
            user: userFromPayload,
            session: sessionId,
        }: IAuthJwtRefreshTokenPayload
    ): Promise<IResponse<AuthRefreshResponseDto>> {
        const checkActive =
            await this.sessionService.findLoginSession(sessionId);
        if (!checkActive) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        const dbSession: ClientSession =
            await this.databaseService.createTransaction();
        try {
            const activeSession = await this.sessionService.findOneActiveById(
                sessionId,
                { session: dbSession }
            );
            const session = await this.sessionService.updateJti(
                activeSession,
                uuidV4(),
                { session: dbSession }
            );

            const user: IUserDoc = await this.userService.findOneActiveById(
                userFromPayload,
                { session: dbSession }
            );
            const token = this.authService.refreshToken(
                user,
                refreshToken,
                session.jti
            );

            await this.databaseService.commitTransaction(dbSession);

            return {
                data: token,
            };
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(dbSession);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @AuthSharedChangePasswordDoc()
    @Response('auth.changePassword')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: AuthChangePasswordRequestDto,
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user')
        userFromPayload: string
    ): Promise<void> {
        let user = await this.userService.findOneById(userFromPayload);

        const passwordAttempt: boolean = this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        const matchPassword = this.authService.validateUser(
            body.oldPassword,
            user.password
        );
        if (!matchPassword) {
            await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const password = this.authService.createPassword(body.newPassword);
        const checkPassword =
            await this.passwordHistoryService.findOneUsedByUser(
                user._id,
                body.newPassword
            );
        if (checkPassword) {
            const passwordPeriod =
                await this.passwordHistoryService.getPasswordPeriod();
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_MUST_NEW,
                message: 'auth.error.passwordMustNew',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            period: passwordPeriod,
                        },
                    },
                },
            });
        }

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            user = await this.userService.updatePassword(user, password, {
                session,
            });

            await this.passwordHistoryService.createByUser(
                user,
                {
                    type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE,
                },
                { session }
            );
            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.changePassword'
                    ),
                },
                { session }
            );
            await this.sessionService.updateManyRevokeByUser(user._id, {
                session,
            });

            await this.databaseService.commitTransaction(session);

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                {
                    send: { email: user.email, name: user.name },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
