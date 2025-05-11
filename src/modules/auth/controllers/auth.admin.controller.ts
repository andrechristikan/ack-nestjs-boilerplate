import { InjectQueue } from '@nestjs/bullmq';
import {
    Controller,
    InternalServerErrorException,
    Param,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { ClientSession } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseService } from 'src/common/database/services/database.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthAdminUpdatePasswordDoc } from 'src/modules/auth/docs/auth.admin.doc';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@ApiTags('modules.admin.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthAdminController {
    constructor(
        private readonly databaseService: DatabaseService,
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    @AuthAdminUpdatePasswordDoc()
    @Response('auth.updatePassword')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.AUTH,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:user/password')
    async updatePassword(
        @AuthJwtPayload('user') updatedBy: string,
        @Param('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const passwordString = this.authService.createPasswordRandom();
            const password = this.authService.createPassword(passwordString, {
                temporary: true,
            });

            user = await this.userService.updatePassword(user, password, {
                session,
            });
            user = await this.userService.resetPasswordAttempt(user, {
                session,
            });

            await this.passwordHistoryService.createByAdmin(
                user,
                {
                    by: updatedBy,
                    type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
                },
                { session, actionBy: updatedBy }
            );

            await this.databaseService.commitTransaction(session);

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                {
                    send: { email: user.email, name: user.name },
                    data: {
                        passwordExpiredAt: password.passwordExpired,
                        password: passwordString,
                    },
                },
                {
                    debounce: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            return;
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
