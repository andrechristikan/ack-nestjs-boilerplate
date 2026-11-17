import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumMfaChallengePurpose } from '@generated/prisma-client/client';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { UserResetPasswordGenerateMfaRequestDto } from '@modules/user/dtos/request/user.reset-password-generate-mfa.request.dto';
import type { UserResetPasswordGenerateMfaResponseDto } from '@modules/user/dtos/response/user.reset-password-generate-mfa.response.dto';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserResetPasswordGenerateMfaUseCase implements IAppUseCase<
    [UserResetPasswordGenerateMfaRequestDto],
    IResponseReturn<UserResetPasswordGenerateMfaResponseDto>
> {
    constructor(
        private readonly userPasswordService: UserPasswordService,
        private readonly mfaService: MfaService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService
    ) {}

    async execute({
        token,
    }: UserResetPasswordGenerateMfaRequestDto): Promise<
        IResponseReturn<UserResetPasswordGenerateMfaResponseDto>
    > {
        const reset = await this.userPasswordService.getOneActiveReset(token);
        const methods = await this.mfaService.getLoginMethods(reset.userId);
        if (!methods.includes(EnumMfaMethod.passkey)) {
            return {
                data: {
                    methods,
                    challengeToken: null,
                    expiresInMs: null,
                    passkeyOptions: null,
                },
            };
        }

        const passkeyOptions = await this.mfaPasskeyService.getAssertionOptions(
            reset.userId
        );
        const { challengeToken, expiresInMs } =
            await this.mfaChallengeService.create({
                purpose: EnumMfaChallengePurpose.resetPassword,
                userId: reset.userId,
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: passkeyOptions.challenge,
            });

        return {
            data: { methods, challengeToken, expiresInMs, passkeyOptions },
        };
    }
}
