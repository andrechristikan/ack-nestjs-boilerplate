import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserQueue } from '@modules/user/queues/user.queue';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserDeleteSelfUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserDeleteSelfRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userAuthService: UserAuthService,
        private readonly mfaService: MfaService,
        private readonly workspaceService: WorkspaceService,
        private readonly userQueue: UserQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        {
            password,
            method,
            code,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: UserDeleteSelfRequestDto
    ): Promise<IResponseReturn<void>> {
        const { user } = userContext;
        this.userService.assertSelfDeletable(user);

        const userId = authContext.userId;

        const state = await this.mfaService.getFactorState(user.id);

        // Sequential by design: a credential proof, awaited alone; a statement whose failure is the answer, awaited before an unrelated write
        const input = {
            action: EnumUserReauthenticationAction.deleteSelf,
            password: password ?? null,
            method: method ?? null,
            code: code ?? null,
            backupCode: backupCode ?? null,
            passkeyChallengeToken: passkeyChallengeToken ?? null,
            passkeyResponse: passkeyResponse ?? null,
            otp: otp ?? null,
        };
        const passwordCheck =
            await this.userAuthService.checkReauthenticationPassword(
                user,
                input
            );
        if (passwordCheck.limit !== null) {
            const limit = passwordCheck.limit;
            const isLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.userAuthService.countFailedReauthenticationInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        limit
                    )
            );

            return this.userAuthService.throwFailedReauthentication(isLocked);
        }

        const mfaCheck = await this.mfaService.checkReauthentication(
            user.id,
            input,
            passwordCheck.isPasswordChecked,
            state
        );
        if (mfaCheck.failure !== null) {
            const failure = mfaCheck.failure;
            const isLocked = await this.databaseService.withTransaction(
                async tx =>
                    this.mfaService.countFailedAttemptInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext.userId,
                        failure
                    )
            );

            return this.mfaService.throwFailedAttempt(failure, isLocked);
        }

        const verificationId =
            await this.userAuthService.getReauthenticationVerificationId(
                user,
                input,
                passwordCheck.isPasswordChecked,
                mfaCheck.isEnabled
            );

        const owned = await this.workspaceService.getOwnedForSelfDelete(userId);

        await this.databaseService.withTransaction(async tx => {
            await this.userAuthService.completeReauthenticationInTx(
                tx,
                authContext,
                passwordCheck.isPasswordChecked,
                verificationId,
                false
            );
            await this.mfaService.completeReauthenticationInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mfaCheck
            );
            const activityLog = this.activityLogQueue.toPayload(
                requestContext,
                apiKeyContext,
                authContext
            );
            const effect = this.userQueue.deleteSelfEffect(
                userId,
                owned,
                activityLog
            );
            await this.outboxService.addInTx(tx, effect);
        });

        return {};
    }
}
