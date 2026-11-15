import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUserContext,
    IUserTwoFactorCheck,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserSetupTwoFactorUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserTwoFactorSetupRequestDto,
    ],
    IResponseReturn<IUserTwoFactorSetup>
> {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userAuthService: UserAuthService,
        private readonly outboxService: OutboxService,
        private readonly userPasswordService: UserPasswordService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { backupCode, password }: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        const { user } = userContext;
        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            requestContext,
            apiKeyContext,
            user,
            password ?? null
        );
        const backupCodeForSetup =
            this.userTwoFactorService.getBackupCodeForSetup(
                user,
                backupCode ?? null
            );
        let backupCodeChecked: IUserTwoFactorCheck | null = null;
        if (backupCodeForSetup !== null) {
            backupCodeChecked = await this.userTwoFactorService.check(
                requestContext,
                apiKeyContext,
                user,
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    code: null,
                    backupCode: backupCodeForSetup,
                }
            );
        }

        const { encryptedSecret, otpauthUrl, secret } =
            await this.userTwoFactorService.setup(user);
        try {
            await this.outboxService.withTransaction(async tx => {
                await this.userPasswordService.resetPasswordAttemptInTx(
                    tx,
                    authContext.userId
                );
                if (backupCodeChecked) {
                    await this.userTwoFactorService.verifyInTx(
                        tx,
                        authContext.userId,
                        backupCodeChecked
                    );
                    await this.userTwoFactorService.saveSetupConsumingBackupCodeInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user,
                        encryptedSecret,
                        backupCodeChecked.verified
                    );

                    return;
                }

                await this.userTwoFactorService.saveSetupInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext.userId,
                    encryptedSecret
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (
                backupCodeChecked &&
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new AuthTwoFactorInvalidException();
            }

            throw new AppUnknownException(err);
        }

        return { data: { secret, otpauthUrl } };
    }
}
