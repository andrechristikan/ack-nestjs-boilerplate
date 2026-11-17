import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import { MfaBackupCodeRegenerateRequestSchema } from '@modules/mfa/dtos/request/mfa.backup-code-regenerate.request.dto';
import type { MfaBackupCodeRegenerateRequestDto } from '@modules/mfa/dtos/request/mfa.backup-code-regenerate.request.dto';
import { MfaPasskeyDeleteRequestSchema } from '@modules/mfa/dtos/request/mfa.passkey-delete.request.dto';
import type { MfaPasskeyDeleteRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-delete.request.dto';
import { MfaPasskeyRegisterRequestSchema } from '@modules/mfa/dtos/request/mfa.passkey-register.request.dto';
import type { MfaPasskeyRegisterRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-register.request.dto';
import { MfaPasskeyUpdateRequestSchema } from '@modules/mfa/dtos/request/mfa.passkey-update.request.dto';
import type { MfaPasskeyUpdateRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-update.request.dto';
import { MfaTotpDisableRequestSchema } from '@modules/mfa/dtos/request/mfa.totp-disable.request.dto';
import type { MfaTotpDisableRequestDto } from '@modules/mfa/dtos/request/mfa.totp-disable.request.dto';
import { MfaTotpEnableRequestSchema } from '@modules/mfa/dtos/request/mfa.totp-enable.request.dto';
import type { MfaTotpEnableRequestDto } from '@modules/mfa/dtos/request/mfa.totp-enable.request.dto';
import { MfaTotpSetupRequestSchema } from '@modules/mfa/dtos/request/mfa.totp-setup.request.dto';
import type { MfaTotpSetupRequestDto } from '@modules/mfa/dtos/request/mfa.totp-setup.request.dto';
import { MfaBackupCodesResponseSchema } from '@modules/mfa/dtos/response/mfa.backup-codes.response.dto';
import type { MfaBackupCodesResponseDto } from '@modules/mfa/dtos/response/mfa.backup-codes.response.dto';
import { MfaPasskeyReauthenticationGenerateResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey-reauthentication-generate.response.dto';
import type { MfaPasskeyReauthenticationGenerateResponseDto } from '@modules/mfa/dtos/response/mfa.passkey-reauthentication-generate.response.dto';
import { MfaPasskeyRegisterResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey-register.response.dto';
import type { MfaPasskeyRegisterResponseDto } from '@modules/mfa/dtos/response/mfa.passkey-register.response.dto';
import { MfaPasskeyRegistrationGenerateResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey-registration-generate.response.dto';
import type { MfaPasskeyRegistrationGenerateResponseDto } from '@modules/mfa/dtos/response/mfa.passkey-registration-generate.response.dto';
import { MfaStatusResponseSchema } from '@modules/mfa/dtos/response/mfa.status.response.dto';
import type { MfaStatusResponseDto } from '@modules/mfa/dtos/response/mfa.status.response.dto';
import { MfaTotpSetupResponseSchema } from '@modules/mfa/dtos/response/mfa.totp-setup.response.dto';
import type { IMfaTotpSetup } from '@modules/mfa/interfaces/mfa.interface';
import { MfaDeletePasskeyUseCase } from '@modules/mfa/use-cases/mfa.delete-passkey.use-case';
import { MfaDisableTotpUseCase } from '@modules/mfa/use-cases/mfa.disable-totp.use-case';
import { MfaEnableTotpUseCase } from '@modules/mfa/use-cases/mfa.enable-totp.use-case';
import { MfaGeneratePasskeyRegistrationUseCase } from '@modules/mfa/use-cases/mfa.generate-passkey-registration.use-case';
import { MfaGeneratePasskeyReauthenticationUseCase } from '@modules/mfa/use-cases/mfa.generate-passkey-reauthentication.use-case';
import { MfaGetStatusUseCase } from '@modules/mfa/use-cases/mfa.get-status.use-case';
import { MfaRegenerateBackupCodesUseCase } from '@modules/mfa/use-cases/mfa.regenerate-backup-codes.use-case';
import { MfaRegisterPasskeyUseCase } from '@modules/mfa/use-cases/mfa.register-passkey.use-case';
import { MfaSetupTotpUseCase } from '@modules/mfa/use-cases/mfa.setup-totp.use-case';
import { MfaUpdatePasskeyUseCase } from '@modules/mfa/use-cases/mfa.update-passkey.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.mfa')
@Controller({
    version: '1',
    path: '/mfa',
})
export class MfaSharedController {
    constructor(
        private readonly mfaGetStatusUseCase: MfaGetStatusUseCase,
        private readonly mfaSetupTotpUseCase: MfaSetupTotpUseCase,
        private readonly mfaEnableTotpUseCase: MfaEnableTotpUseCase,
        private readonly mfaDisableTotpUseCase: MfaDisableTotpUseCase,
        private readonly mfaRegenerateBackupCodesUseCase: MfaRegenerateBackupCodesUseCase,
        private readonly mfaGeneratePasskeyRegistrationUseCase: MfaGeneratePasskeyRegistrationUseCase,
        private readonly mfaGeneratePasskeyReauthenticationUseCase: MfaGeneratePasskeyReauthenticationUseCase,
        private readonly mfaRegisterPasskeyUseCase: MfaRegisterPasskeyUseCase,
        private readonly mfaUpdatePasskeyUseCase: MfaUpdatePasskeyUseCase,
        private readonly mfaDeletePasskeyUseCase: MfaDeletePasskeyUseCase
    ) {}

    @Doc({ summary: 'get current multi-factor authentication status' })
    @Response('mfa.status', { schema: MfaStatusResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/status/get')
    async getStatus(
        @UserContext() userContext: IUserContext
    ): Promise<IResponseReturn<MfaStatusResponseDto>> {
        return this.mfaGetStatusUseCase.execute(userContext);
    }

    @Doc({
        summary:
            'start authenticator app setup with the current proof and receive the secret',
    })
    @Response('mfa.totp.setup', { schema: MfaTotpSetupResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/totp/setup')
    async setupTotp(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: MfaTotpSetupRequestSchema })
        body: MfaTotpSetupRequestDto
    ): Promise<IResponseReturn<IMfaTotpSetup>> {
        return this.mfaSetupTotpUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }

    @Doc({
        summary:
            'enable the authenticator app with the code of the new authenticator',
    })
    @Response('mfa.totp.enable', { schema: MfaBackupCodesResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/totp/enable')
    async enableTotp(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: MfaTotpEnableRequestSchema })
        body: MfaTotpEnableRequestDto
    ): Promise<IResponseReturn<MfaBackupCodesResponseDto>> {
        return this.mfaEnableTotpUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }

    @Doc({ summary: 'disable the authenticator app' })
    @Response('mfa.totp.disable')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/totp/disable')
    async disableTotp(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: MfaTotpDisableRequestSchema })
        body: MfaTotpDisableRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.mfaDisableTotpUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }

    @Doc({ summary: 'regenerate multi-factor authentication backup codes' })
    @Response('mfa.backupCode.regenerate', {
        schema: MfaBackupCodesResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/backup-code/regenerate')
    async regenerateBackupCodes(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: MfaBackupCodeRegenerateRequestSchema })
        body: MfaBackupCodeRegenerateRequestDto
    ): Promise<IResponseReturn<MfaBackupCodesResponseDto>> {
        return this.mfaRegenerateBackupCodesUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }

    @Doc({
        summary:
            'generate the options to register a passkey, with the challenge token',
    })
    @Response('mfa.passkey.registrationGenerate', {
        schema: MfaPasskeyRegistrationGenerateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/passkey/registration/generate')
    async generatePasskeyRegistration(
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext
    ): Promise<IResponseReturn<MfaPasskeyRegistrationGenerateResponseDto>> {
        return this.mfaGeneratePasskeyRegistrationUseCase.execute(
            authContext,
            userContext
        );
    }

    @Doc({
        summary:
            'generate the options to re-authenticate with a passkey, with the challenge token',
    })
    @Response('mfa.passkey.reauthenticationGenerate', {
        schema: MfaPasskeyReauthenticationGenerateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/passkey/reauthentication/generate')
    async generatePasskeyReauthentication(
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<MfaPasskeyReauthenticationGenerateResponseDto>> {
        return this.mfaGeneratePasskeyReauthenticationUseCase.execute(
            authContext
        );
    }

    @Doc({ summary: 'register a passkey with the attestation of the options' })
    @Response('mfa.passkey.register', {
        schema: MfaPasskeyRegisterResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/passkey/register')
    async registerPasskey(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: MfaPasskeyRegisterRequestSchema })
        body: MfaPasskeyRegisterRequestDto
    ): Promise<IResponseReturn<MfaPasskeyRegisterResponseDto>> {
        return this.mfaRegisterPasskeyUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }

    @Doc({ summary: 'rename a passkey' })
    @Response('mfa.passkey.update')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/passkey/:passkeyId/update')
    async updatePasskey(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Param('passkeyId', { schema: RequestMongoIdSchema })
        passkeyId: string,
        @Body({ schema: MfaPasskeyUpdateRequestSchema })
        body: MfaPasskeyUpdateRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.mfaUpdatePasskeyUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            passkeyId,
            body
        );
    }

    @Doc({ summary: 'delete a passkey' })
    @Response('mfa.passkey.delete')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.mfa)
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/passkey/:passkeyId/delete')
    async deletePasskey(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Param('passkeyId', { schema: RequestMongoIdSchema })
        passkeyId: string,
        @Body({ schema: MfaPasskeyDeleteRequestSchema })
        body: MfaPasskeyDeleteRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.mfaDeletePasskeyUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            passkeyId,
            body
        );
    }
}
