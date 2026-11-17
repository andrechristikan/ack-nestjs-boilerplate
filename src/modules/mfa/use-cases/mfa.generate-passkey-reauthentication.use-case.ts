import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { MfaPasskeyReauthenticationGenerateResponseDto } from '@modules/mfa/dtos/response/mfa.passkey-reauthentication-generate.response.dto';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaGeneratePasskeyReauthenticationUseCase implements IAppUseCase<
    [IAuthJwtAccessContext],
    IResponseReturn<MfaPasskeyReauthenticationGenerateResponseDto>
> {
    constructor(
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService
    ) {}

    async execute(
        authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<MfaPasskeyReauthenticationGenerateResponseDto>> {
        // Sequential by design: gate before the work it guards
        await this.mfaPasskeyService.assertHasPasskey(authContext.userId);
        const passkeyOptions = await this.mfaPasskeyService.getAssertionOptions(
            authContext.userId
        );

        const { challengeToken, expiresInMs } =
            await this.mfaChallengeService.create({
                purpose: EnumMfaChallengePurpose.reauthentication,
                userId: authContext.userId,
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: passkeyOptions.challenge,
            });

        return { data: { challengeToken, expiresInMs, passkeyOptions } };
    }
}
