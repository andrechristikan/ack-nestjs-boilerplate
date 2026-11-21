import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { CountryService } from '@modules/country/services/country.service';
import type { UserUpdateMobileNumberRequestDto } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
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
export class UserUpdateMobileNumberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        string,
        UserUpdateMobileNumberRequestDto,
    ],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly userAuthService: UserAuthService,
        private readonly countryService: CountryService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        mobileNumberId: string,
        {
            number,
            countryId,
            phoneCode,
            password,
            method,
            code,
            backupCode,
            passkeyChallengeToken,
            passkeyResponse,
            otp,
        }: UserUpdateMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const { user } = userContext;
        // Sequential by design: gate before the work it guards
        const check = await this.userAuthService.assertReauthentication(
            requestContext,
            apiKeyContext,
            user,
            {
                action: EnumUserReauthenticationAction.mobileNumberUpdate,
                password: password ?? null,
                method: method ?? null,
                code: code ?? null,
                backupCode: backupCode ?? null,
                passkeyChallengeToken: passkeyChallengeToken ?? null,
                passkeyResponse: passkeyResponse ?? null,
                otp: otp ?? null,
            }
        );
        const current = await this.userMobileNumberService.getOneMobileNumber(
            authContext.userId,
            mobileNumberId
        );
        const [country, isDuplicate] = await Promise.all([
            this.countryService.getOne(countryId),
            this.userMobileNumberService.existsMobileNumber(
                authContext.userId,
                { number, countryId, phoneCode },
                current.id
            ),
        ]);

        try {
            const mobileNumber = await this.databaseService.withTransaction(
                async tx => {
                    await this.userAuthService.completeReauthenticationInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        check
                    );

                    return this.userMobileNumberService.updateMobileNumberInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        current,
                        { number, countryId, phoneCode },
                        country.phoneCode,
                        isDuplicate
                    );
                }
            );

            return { data: mobileNumber };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isCollision = this.databaseUtil.isUniqueCollision(
                err,
                'number'
            );
            if (isCollision) {
                throw new UserMobileNumberExistException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (
                check.mfa !== null &&
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new MfaInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }
}
