import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { MfaPasskeyRegistrationGenerateResponseDto } from '@modules/mfa/dtos/response/mfa.passkey-registration-generate.response.dto';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaGeneratePasskeyRegistrationUseCase implements IAppUseCase<
    [IAuthJwtAccessContext, IUserContext],
    IResponseReturn<MfaPasskeyRegistrationGenerateResponseDto>
> {
    constructor(
        private readonly mfaService: MfaService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService
    ) {}

    async execute(
        authContext: IAuthJwtAccessContext,
        { user }: IUserContext
    ): Promise<IResponseReturn<MfaPasskeyRegistrationGenerateResponseDto>> {
        const [passkeyOptions] = await Promise.all([
            this.mfaPasskeyService.getRegistrationOptions(
                authContext.userId,
                user.email,
                user.username
            ),
            this.mfaService.assertEnrolmentAllowed(EnumMfaMethod.passkey),
        ]);

        const { challengeToken, expiresInMs } =
            await this.mfaChallengeService.create({
                purpose: EnumMfaChallengePurpose.registration,
                userId: authContext.userId,
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: passkeyOptions.challenge,
            });

        return { data: { challengeToken, expiresInMs, passkeyOptions } };
    }
}
