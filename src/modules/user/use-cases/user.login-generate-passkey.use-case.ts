import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import type { UserLoginPasskeyGenerateResponseDto } from '@modules/user/dtos/response/user.login-passkey-generate.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserLoginGeneratePasskeyUseCase implements IAppUseCase<
    [],
    IResponseReturn<UserLoginPasskeyGenerateResponseDto>
> {
    constructor(
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService
    ) {}

    async execute(): Promise<
        IResponseReturn<UserLoginPasskeyGenerateResponseDto>
    > {
        const passkeyOptions =
            await this.mfaPasskeyService.getAssertionOptions(null);

        const { challengeToken, expiresInMs } =
            await this.mfaChallengeService.create({
                purpose: EnumMfaChallengePurpose.passwordless,
                userId: null,
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: passkeyOptions.challenge,
            });

        return { data: { challengeToken, expiresInMs, passkeyOptions } };
    }
}
