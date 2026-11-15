import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import type { UserDeleteMobileNumberRequestDto } from '@modules/user/dtos/request/user.delete-mobile-number.request.dto';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type {
    IUserContext,
    IUserMobileNumber,
} from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserDeleteMobileNumberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        UserDeleteMobileNumberRequestDto,
    ],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly userAuthService: UserAuthService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        mobileNumberId: string,
        {
            password,
            method,
            code,
            backupCode,
            otp,
        }: UserDeleteMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const { user } = userContext;
        // Sequential by design: gate before the work it guards
        const check = await this.userAuthService.assertReauthentication(
            requestContext,
            apiKeyContext,
            user,
            {
                action: EnumUserReauthenticationAction.mobileNumberDelete,
                password: password ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                otp: otp ?? null,
            }
        );
        await this.userMobileNumberService.getOneMobileNumber(
            authContext.userId,
            mobileNumberId
        );

        try {
            const mobileNumber = await this.outboxService.withTransaction(
                async tx => {
                    await this.userAuthService.completeReauthenticationInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        user,
                        check
                    );

                    return this.userMobileNumberService.deleteMobileNumberInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        mobileNumberId
                    );
                }
            );

            return { data: mobileNumber };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserMobileNumberNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }
}
