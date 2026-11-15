import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginSetupTwoFactorUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserLoginSetupTwoFactorRequestDto],
    IResponseReturn<UserTwoFactorEnableResponseDto>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { code, challengeToken }: UserLoginSetupTwoFactorRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const challenge =
            await this.userTwoFactorService.getChallenge(challengeToken);

        const { user, pendingSecret } =
            await this.userTwoFactorService.getOneForLoginSetup(
                challenge.userId
            );
        const totpStep = await this.userTwoFactorService.checkSetupCode(
            requestContext,
            apiKeyContext,
            user,
            pendingSecret,
            code
        );

        try {
            const backupCodes = await this.outboxService.withTransaction(
                async tx => {
                    await this.userTwoFactorService.verifySetupCodeInTx(
                        tx,
                        user.id,
                        totpStep
                    );

                    return this.userTwoFactorService.enableTwoFactorInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user.id,
                        pendingSecret
                    );
                }
            );

            return { data: { backupCodes } };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorSetupRequiredException();
            }

            throw new AppUnknownException(err);
        }
    }
}
