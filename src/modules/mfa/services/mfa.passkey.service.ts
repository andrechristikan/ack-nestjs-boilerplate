import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
    VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { MfaPasskey } from '@generated/prisma-client/client';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaPasskeyAlreadyRegisteredException } from '@modules/mfa/exceptions/mfa.passkey-already-registered.exception';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';
import { MfaPasskeyLimitException } from '@modules/mfa/exceptions/mfa.passkey-limit.exception';
import { MfaPasskeyNotFoundException } from '@modules/mfa/exceptions/mfa.passkey-not-found.exception';
import type {
    IMfaPasskey,
    IMfaPasskeyCheck,
    IMfaPasskeyCredential,
    IMfaPasskeyRegistration,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaPasskeyRepository } from '@modules/mfa/repositories/mfa.passkey.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MfaPasskeyService {
    private readonly rpId: string;
    private readonly rpName: string;
    private readonly origins: string[];

    constructor(
        private readonly mfaPasskeyRepository: MfaPasskeyRepository,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly featureFlagService: FeatureFlagService
    ) {
        this.rpId = this.configService.get<string>('mfa.passkey.rpId')!;
        this.rpName = this.configService.get<string>('mfa.passkey.rpName')!;
        this.origins = this.configService.get<string[]>('mfa.passkey.origins')!;
    }

    private async createRegistrationOptions(
        userId: string,
        username: string,
        excludeCredentials: { id: string; transports: string[] }[]
    ): Promise<PublicKeyCredentialCreationOptionsJSON> {
        return generateRegistrationOptions({
            rpName: this.rpName,
            rpID: this.rpId,
            userID: new TextEncoder().encode(userId),
            userName: username,
            userDisplayName: username,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'required',
            },
            excludeCredentials,
        });
    }

    private matchOrigin(clientDataJSON: string): string | null {
        const wildcardPrefix = 'https://*.';
        let data: unknown;
        try {
            data = JSON.parse(
                Buffer.from(clientDataJSON, 'base64url').toString('utf8')
            );
        } catch {
            return null;
        }
        if (
            typeof data !== 'object' ||
            data === null ||
            !('origin' in data) ||
            typeof data.origin !== 'string'
        ) {
            return null;
        }

        const origin = data.origin;
        const isMatched = this.origins.some(entry => {
            if (entry === '*') {
                return URL.canParse(origin);
            }
            if (!entry.startsWith(wildcardPrefix)) {
                return entry === origin;
            }
            if (!URL.canParse(origin)) {
                return false;
            }

            const url = new URL(origin);

            return (
                url.protocol === 'https:' &&
                url.port === '' &&
                url.origin === origin &&
                url.hostname.endsWith(`.${entry.slice(wildcardPrefix.length)}`)
            );
        });

        return isMatched ? origin : null;
    }

    private async verifyAttestation(
        response: RegistrationResponseJSON,
        webAuthnChallenge: string
    ): Promise<VerifiedRegistrationResponse> {
        const expectedOrigin = this.matchOrigin(
            response.response.clientDataJSON
        );
        if (expectedOrigin === null) {
            throw new MfaPasskeyInvalidException();
        }

        try {
            return await verifyRegistrationResponse({
                response,
                expectedChallenge: webAuthnChallenge,
                expectedOrigin,
                expectedRPID: this.rpId,
            });
        } catch {
            throw new MfaPasskeyInvalidException();
        }
    }

    private async verifyAssertion(
        stored: MfaPasskey,
        response: AuthenticationResponseJSON,
        webAuthnChallenge: string
    ): Promise<number | null> {
        const expectedOrigin = this.matchOrigin(
            response.response.clientDataJSON
        );
        if (expectedOrigin === null) {
            return null;
        }

        try {
            const verified = await verifyAuthenticationResponse({
                response,
                expectedChallenge: webAuthnChallenge,
                expectedOrigin,
                expectedRPID: this.rpId,
                credential: {
                    id: stored.credentialId,
                    publicKey: new Uint8Array(
                        Buffer.from(stored.publicKey, 'base64url')
                    ),
                    counter: stored.counter,
                    transports: stored.transports,
                },
                requireUserVerification: true,
            });

            return verified.verified
                ? verified.authenticationInfo.newCounter
                : null;
        } catch {
            return null;
        }
    }

    private async getMaxPerUser(): Promise<number> {
        return this.featureFlagService.getMetadataNumber(
            EnumFeatureFlagKey.mfa,
            EnumFeatureFlagMetadataKey.passkeyMaxPerUser
        );
    }

    async getRegistrationOptions(
        userId: string,
        username: string
    ): Promise<PublicKeyCredentialCreationOptionsJSON> {
        const credentials =
            await this.mfaPasskeyRepository.findCredentialsByUserId(userId);

        return this.createRegistrationOptions(
            userId,
            username,
            credentials.map(({ credentialId, transports }) => ({
                id: credentialId,
                transports,
            }))
        );
    }

    async getCredentialsByUser(
        userId: string
    ): Promise<IMfaPasskeyCredential[]> {
        return this.mfaPasskeyRepository.findCredentialsByUserId(userId);
    }

    async getAssertionOptions(
        credentials: IMfaPasskeyCredential[]
    ): Promise<PublicKeyCredentialRequestOptionsJSON> {
        return generateAuthenticationOptions({
            rpID: this.rpId,
            userVerification: 'required',
            allowCredentials: credentials.map(
                ({ credentialId, transports }) => ({
                    id: credentialId,
                    transports,
                })
            ),
        });
    }

    /** Reads the passkey of a credential id; no passkey throws MfaPasskeyInvalidException. */
    async getOneForLogin(credentialId: string): Promise<MfaPasskey> {
        const passkey =
            await this.mfaPasskeyRepository.findOneByCredentialId(credentialId);
        if (passkey === null) {
            throw new MfaPasskeyInvalidException();
        }

        return passkey;
    }

    /** Answers the passkey id and new counter of an assertion the library verifies for a passkey of the user; null for a missing response or challenge, an unknown or foreign credential, a failed verification, or a counter that did not rise; a user without a passkey throws MfaMethodUnavailableException; counts nothing. */
    async checkAssertion(
        userId: string,
        passkeyResponse: AuthenticationResponseJSON | null,
        webAuthnChallenge: string | null
    ): Promise<IMfaPasskeyCheck | null> {
        // Sequential by design: a credential proof, awaited alone
        const hasPasskey =
            await this.mfaPasskeyRepository.existsByUserId(userId);
        if (!hasPasskey) {
            throw new MfaMethodUnavailableException();
        }
        if (passkeyResponse === null || webAuthnChallenge === null) {
            return null;
        }

        const stored = await this.mfaPasskeyRepository.findOneByCredentialId(
            passkeyResponse.id
        );
        if (stored === null || stored.userId !== userId) {
            return null;
        }

        const counter = await this.verifyAssertion(
            stored,
            passkeyResponse,
            webAuthnChallenge
        );
        const isCounterAdvanced =
            counter !== null &&
            (counter > stored.counter ||
                (counter === 0 && stored.counter === 0));

        return isCounterAdvanced ? { id: stored.id, counter } : null;
    }

    /** Stamps the counter and last use of a passkey; a passkey that no longer exists throws MfaPasskeyInvalidException. */
    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        passkeyId: string,
        counter: number,
        updatedBy: string
    ): Promise<void> {
        const now = this.helperDateService.create();
        const isMarked = await this.mfaPasskeyRepository.markUsedInTx(
            tx,
            passkeyId,
            counter,
            now,
            updatedBy
        );
        if (!isMarked) {
            throw new MfaPasskeyInvalidException();
        }
    }

    /** Checks a registration before any transaction opens and answers the verified values registerInTx stores; a list holding the passkeyMaxPerUser passkeys, a failed attestation, and a known credential id throw, in that order. */
    async assertRegistrable(
        userId: string,
        response: RegistrationResponseJSON,
        webAuthnChallenge: string
    ): Promise<IMfaPasskeyRegistration> {
        const [maxPerUser, count, verified] = await Promise.all([
            this.getMaxPerUser(),
            this.mfaPasskeyRepository.countByUserId(userId),
            this.verifyAttestation(response, webAuthnChallenge),
        ]);
        if (count >= maxPerUser) {
            throw new MfaPasskeyLimitException();
        }

        if (!verified.verified) {
            throw new MfaPasskeyInvalidException();
        }

        const { credential, credentialDeviceType, credentialBackedUp } =
            verified.registrationInfo;
        const registered =
            await this.mfaPasskeyRepository.findOneByCredentialId(
                credential.id
            );
        if (registered !== null) {
            throw new MfaPasskeyAlreadyRegisteredException();
        }

        return {
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString('base64url'),
            counter: credential.counter,
            transports: credential.transports ?? [],
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
        };
    }

    /** Stores the passkey of a verified registration on the given tx. */
    async registerInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        name: string,
        registration: IMfaPasskeyRegistration
    ): Promise<IMfaPasskey> {
        return this.mfaPasskeyRepository.createInTx(tx, {
            userId,
            name,
            ...registration,
        });
    }

    async getList(userId: string): Promise<IMfaPasskey[]> {
        return this.mfaPasskeyRepository.findManyByUserId(userId);
    }

    async existsByUser(userId: string): Promise<boolean> {
        return this.mfaPasskeyRepository.existsByUserId(userId);
    }

    assertHasPasskey(credentials: IMfaPasskeyCredential[]): void {
        if (credentials.length === 0) {
            throw new MfaMethodUnavailableException();
        }
    }

    async existsByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        return this.mfaPasskeyRepository.existsByUserIdInTx(tx, userId);
    }

    async updateNameInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        passkeyId: string,
        name: string
    ): Promise<void> {
        const isUpdated = await this.mfaPasskeyRepository.updateNameInTx(
            tx,
            userId,
            passkeyId,
            name
        );
        if (!isUpdated) {
            throw new MfaPasskeyNotFoundException();
        }
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        passkeyId: string
    ): Promise<void> {
        const isDeleted = await this.mfaPasskeyRepository.deleteInTx(
            tx,
            userId,
            passkeyId
        );
        if (!isDeleted) {
            throw new MfaPasskeyNotFoundException();
        }
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.mfaPasskeyRepository.deleteByUserInTx(tx, userId);
    }
}
