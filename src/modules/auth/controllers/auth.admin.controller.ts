import {
    Controller,
    InternalServerErrorException,
    Param,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthAdminUpdatePasswordDoc } from 'src/modules/auth/docs/auth.admin.doc';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_EMAIL } from 'src/modules/email/enums/email.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { WorkerQueue } from 'src/worker/decorators/worker.decorator';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@ApiTags('modules.admin.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthAdminController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        @WorkerQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) {}

    @AuthAdminUpdatePasswordDoc()
    @Response('auth.updatePassword')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.AUTH,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:user/password')
    async updatePassword(
        @Param('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const passwordString =
                await this.authService.createPasswordRandom();
            const password = await this.authService.createPassword(
                passwordString,
                {
                    temporary: true,
                }
            );
            user = await this.userService.updatePassword(user, password, {
                session,
            });
            user = await this.userService.resetPasswordAttempt(user, {
                session,
            });

            this.emailQueue.add(
                ENUM_EMAIL.TEMP_PASSWORD,
                {
                    email: user.email,
                    name: user.name,
                    passwordExpiredAt: password.passwordExpired,
                    password: passwordString,
                },
                {
                    debounce: {
                        id: `${ENUM_EMAIL.TEMP_PASSWORD}-${user._id}`,
                        ttl: 1000,
                    },
                }
            );

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }
}
