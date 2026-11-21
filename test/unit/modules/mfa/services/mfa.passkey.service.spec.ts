import { ConfigService } from '@nestjs/config';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
} from '@simplewebauthn/server';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumMfaPasskeyDeviceType } from '@generated/prisma-client/client';
import type { MfaPasskey } from '@generated/prisma-client/client';
import type {
    IMfaPasskey,
    IMfaPasskeyRegistration,
} from '@modules/mfa/interfaces/mfa.interface';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import type { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import type { MfaPasskeyRepository } from '@modules/mfa/repositories/mfa.passkey.repository';
import type { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import {
    buildClientDataJson,
    createMfaPasskeyService,
} from '@test/unit/helpers/test.unit.mfa.helper';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

vi.mock('@simplewebauthn/server', () => ({
    generateAuthenticationOptions: vi.fn(),
    generateRegistrationOptions: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
}));

describe('MfaPasskeyService', () => {
    const mfaPasskeyRepository: MockProxy<MfaPasskeyRepository> =
        mock<MfaPasskeyRepository>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    let configService: MockProxy<ConfigService>;

    let service: MfaPasskeyService;

    const options = {
        challenge: 'challenge-quartz',
    } as PublicKeyCredentialCreationOptionsJSON;

    const stored: MfaPasskey = {
        id: 'passkey-one',
        userId: 'user-quartz',
        credentialId: 'credential-one',
        publicKey: 'ZGVm-w',
        counter: 5,
        transports: ['internal'],
        deviceType: EnumMfaPasskeyDeviceType.multiDevice,
        backedUp: true,
        name: 'iPhone',
        lastUsedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-quartz',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const assertion: AuthenticationResponseJSON = {
        id: 'credential-one',
        rawId: 'credential-one',
        response: {
            clientDataJSON: buildClientDataJson('https://app.example.test'),
            authenticatorData: 'authenticator-data',
            signature: 'signature',
        },
        clientExtensionResults: {},
        type: 'public-key',
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    const configValues = {
        'app.timezone': 'UTC',
        'mfa.passkey.rpId': 'example.test',
        'mfa.passkey.rpName': 'Ack Example',
        'mfa.passkey.origins': [
            'https://*.example.test',
            'https://app.other.test',
            'android:apk-key-hash:x',
        ],
    };

    beforeEach(async () => {
        configService = buildConfigService(configValues);

        service = await createMfaPasskeyService({
            mfaPasskeyRepository,
            configService,
            featureFlagService,
        });
    });

    describe('getRegistrationOptions', () => {
        it('passes the relying party, the required verification, and the passkeys of the user as excluded credentials to the library', async () => {
            mfaPasskeyRepository.findCredentialsByUserId.mockResolvedValue([
                { credentialId: 'credential-one', transports: ['internal'] },
                { credentialId: 'credential-two', transports: [] },
            ]);
            vi.mocked(generateRegistrationOptions).mockResolvedValue(options);

            await expect(
                service.getRegistrationOptions(
                    'user-quartz',
                    'quartz@example.test',
                    'quartz'
                )
            ).resolves.toBe(options);

            expect(
                mfaPasskeyRepository.findCredentialsByUserId
            ).toHaveBeenCalledWith('user-quartz');
            expect(generateRegistrationOptions).toHaveBeenCalledWith({
                rpName: 'Ack Example',
                rpID: 'example.test',
                userID: new TextEncoder().encode('user-quartz'),
                userName: 'quartz@example.test',
                userDisplayName: 'quartz',
                attestationType: 'none',
                authenticatorSelection: {
                    residentKey: 'required',
                    userVerification: 'required',
                },
                excludeCredentials: [
                    { id: 'credential-one', transports: ['internal'] },
                    { id: 'credential-two', transports: [] },
                ],
            });
        });
    });

    describe('getCredentialsByUser', () => {
        it('answers the credentials the repository finds for the user', async () => {
            const credentials = [
                { credentialId: 'credential-one', transports: ['internal'] },
            ];
            mfaPasskeyRepository.findCredentialsByUserId.mockResolvedValue(
                credentials
            );

            await expect(
                service.getCredentialsByUser('user-quartz')
            ).resolves.toBe(credentials);

            expect(
                mfaPasskeyRepository.findCredentialsByUserId
            ).toHaveBeenCalledWith('user-quartz');
        });
    });

    describe('getAssertionOptions', () => {
        const requestOptions = {
            challenge: 'challenge-quartz',
        } as PublicKeyCredentialRequestOptionsJSON;

        it('passes the relying party, the required verification, and the given credentials as allowed credentials to the library without reading the repository', async () => {
            vi.mocked(generateAuthenticationOptions).mockResolvedValue(
                requestOptions
            );

            await expect(
                service.getAssertionOptions([
                    {
                        credentialId: 'credential-one',
                        transports: ['internal'],
                    },
                    { credentialId: 'credential-two', transports: [] },
                ])
            ).resolves.toBe(requestOptions);

            expect(
                mfaPasskeyRepository.findCredentialsByUserId
            ).not.toHaveBeenCalled();
            expect(generateAuthenticationOptions).toHaveBeenCalledWith({
                rpID: 'example.test',
                userVerification: 'required',
                allowCredentials: [
                    { id: 'credential-one', transports: ['internal'] },
                    { id: 'credential-two', transports: [] },
                ],
            });
        });

        it('allows no credential for an empty list', async () => {
            vi.mocked(generateAuthenticationOptions).mockResolvedValue(
                requestOptions
            );

            await service.getAssertionOptions([]);

            expect(generateAuthenticationOptions).toHaveBeenCalledWith({
                rpID: 'example.test',
                userVerification: 'required',
                allowCredentials: [],
            });
        });
    });

    describe('getOneForLogin', () => {
        it('answers the stored passkey of a credential id', async () => {
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue(
                stored
            );

            await expect(
                service.getOneForLogin('credential-one')
            ).resolves.toBe(stored);
            expect(
                mfaPasskeyRepository.findOneByCredentialId
            ).toHaveBeenCalledWith('credential-one');
        });

        it('throws MfaPasskeyInvalidException when no passkey holds the credential id', async () => {
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue(null);

            await expect(
                service.getOneForLogin('credential-one')
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
        });
    });

    describe('checkAssertion', () => {
        beforeEach(() => {
            mfaPasskeyRepository.existsByUserId.mockResolvedValue(true);
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue(
                stored
            );
            vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
                verified: true,
                authenticationInfo: { newCounter: 8 },
            } as Awaited<ReturnType<typeof verifyAuthenticationResponse>>);
        });

        it('throws MfaMethodUnavailableException for a user without a passkey', async () => {
            mfaPasskeyRepository.existsByUserId.mockResolvedValue(false);

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
        });

        it('verifies the assertion against the stored challenge, the response origin, the relying party id, and the stored credential', async () => {
            await service.checkAssertion(
                'user-quartz',
                assertion,
                'challenge-stored'
            );

            expect(verifyAuthenticationResponse).toHaveBeenCalledWith({
                response: assertion,
                expectedChallenge: 'challenge-stored',
                expectedOrigin: 'https://app.example.test',
                expectedRPID: 'example.test',
                credential: {
                    id: 'credential-one',
                    publicKey: new Uint8Array(
                        Buffer.from('ZGVm-w', 'base64url')
                    ),
                    counter: 5,
                    transports: ['internal'],
                },
                requireUserVerification: true,
            });
        });

        it.each([
            ['an exact entry', 'https://app.other.test'],
            ['a label under a wildcard entry', 'https://app.example.test'],
            [
                'several labels under a wildcard entry',
                'https://a.b.example.test',
            ],
            ['an android entry', 'android:apk-key-hash:x'],
        ])(
            'passes the response origin of %s to the library',
            async (_label, origin) => {
                await service.checkAssertion(
                    'user-quartz',
                    {
                        ...assertion,
                        response: {
                            ...assertion.response,
                            clientDataJSON: buildClientDataJson(origin),
                        },
                    },
                    'challenge-stored'
                );

                expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
                    expect.objectContaining({ expectedOrigin: origin })
                );
            }
        );

        it.each([
            ['the wildcard domain itself', 'https://example.test'],
            ['an origin outside every entry', 'https://evil.test'],
            ['a wildcard label over http', 'http://app.example.test'],
            ['a wildcard label with a port', 'https://app.example.test:8443'],
            [
                'a host that only ends with the domain text',
                'https://appexample.test',
            ],
            ['an origin that is not a URL', 'app.example.test'],
            ['an origin that is not a string', 7],
            ['an origin that is missing', undefined],
        ])(
            'answers null without calling the library for %s',
            async (_label, origin) => {
                const clientDataJSON = Buffer.from(
                    JSON.stringify({ origin })
                ).toString('base64url');

                await expect(
                    service.checkAssertion(
                        'user-quartz',
                        {
                            ...assertion,
                            response: { ...assertion.response, clientDataJSON },
                        },
                        'challenge-stored'
                    )
                ).resolves.toBeNull();
                expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
            }
        );

        it.each([
            ['not base64url JSON', 'client-data'],
            ['a JSON array', Buffer.from('[]').toString('base64url')],
            ['JSON null', Buffer.from('null').toString('base64url')],
        ])(
            'answers null without calling the library for a clientDataJSON that is %s',
            async (_label, clientDataJSON) => {
                await expect(
                    service.checkAssertion(
                        'user-quartz',
                        {
                            ...assertion,
                            response: { ...assertion.response, clientDataJSON },
                        },
                        'challenge-stored'
                    )
                ).resolves.toBeNull();
                expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
            }
        );

        describe('with the origin entry *', () => {
            beforeEach(async () => {
                stubConfigValues(configService, {
                    ...configValues,
                    'mfa.passkey.origins': ['*'],
                });
                service = await createMfaPasskeyService({
                    mfaPasskeyRepository,
                    configService,
                    featureFlagService,
                });
                vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
                    verified: true,
                    authenticationInfo: { newCounter: 8 },
                } as Awaited<ReturnType<typeof verifyAuthenticationResponse>>);
            });

            it.each([
                ['an https origin', 'https://anything.test'],
                ['an origin with a port', 'http://localhost:3000'],
                ['an android origin', 'android:apk-key-hash:anything'],
            ])(
                'passes the response origin of %s to the library',
                async (_label, origin) => {
                    await service.checkAssertion(
                        'user-quartz',
                        {
                            ...assertion,
                            response: {
                                ...assertion.response,
                                clientDataJSON: buildClientDataJson(origin),
                            },
                        },
                        'challenge-stored'
                    );

                    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
                        expect.objectContaining({ expectedOrigin: origin })
                    );
                }
            );

            it.each([
                [
                    'an origin that is not a URL',
                    buildClientDataJson('anything'),
                ],
                ['not base64url JSON', 'client-data'],
            ])(
                'answers null without calling the library for %s',
                async (_label, clientDataJSON) => {
                    await expect(
                        service.checkAssertion(
                            'user-quartz',
                            {
                                ...assertion,
                                response: {
                                    ...assertion.response,
                                    clientDataJSON,
                                },
                            },
                            'challenge-stored'
                        )
                    ).resolves.toBeNull();
                    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
                }
            );
        });

        it('answers the passkey id and the new counter of a valid assertion and counts nothing', async () => {
            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toEqual({ id: 'passkey-one', counter: 8 });
        });

        it('answers null for a null response without verifying', async () => {
            await expect(
                service.checkAssertion('user-quartz', null, 'challenge-stored')
            ).resolves.toBeNull();
            expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
        });

        it('answers null for a null challenge without verifying', async () => {
            await expect(
                service.checkAssertion('user-quartz', assertion, null)
            ).resolves.toBeNull();
            expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
        });

        it('answers null for an unknown credential id', async () => {
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue(null);

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toBeNull();
            expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
        });

        it('answers null for a credential of another user even when its assertion is valid', async () => {
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue({
                ...stored,
                userId: 'user-other',
            });

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toBeNull();
            expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
        });

        it('answers null when the library throws', async () => {
            vi.mocked(verifyAuthenticationResponse).mockRejectedValue(
                new Error('bad signature')
            );

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toBeNull();
        });

        it('answers null when the library reports the assertion unverified', async () => {
            vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
                verified: false,
                authenticationInfo: { newCounter: 8 },
            } as Awaited<ReturnType<typeof verifyAuthenticationResponse>>);

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toBeNull();
        });

        it('answers null for a counter of 5 against a stored 5', async () => {
            vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
                verified: true,
                authenticationInfo: { newCounter: 5 },
            } as Awaited<ReturnType<typeof verifyAuthenticationResponse>>);

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toBeNull();
        });

        it('accepts a counter of 0 against a stored 0', async () => {
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue({
                ...stored,
                counter: 0,
            });
            vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
                verified: true,
                authenticationInfo: { newCounter: 0 },
            } as Awaited<ReturnType<typeof verifyAuthenticationResponse>>);

            await expect(
                service.checkAssertion(
                    'user-quartz',
                    assertion,
                    'challenge-stored'
                )
            ).resolves.toEqual({ id: 'passkey-one', counter: 0 });
        });
    });

    describe('markUsedInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const now = new Date('2026-03-01T00:00:00.000Z');

        it('stamps the counter and the last use of the passkey on the given tx', async () => {
            vi.setSystemTime(now);
            mfaPasskeyRepository.markUsedInTx.mockResolvedValue(true);

            await service.markUsedInTx(tx, 'passkey-one', 8, 'user-quartz');

            expect(mfaPasskeyRepository.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'passkey-one',
                8,
                now,
                'user-quartz'
            );
        });

        it('throws MfaPasskeyInvalidException when the passkey is gone', async () => {
            vi.setSystemTime(now);
            mfaPasskeyRepository.markUsedInTx.mockResolvedValue(false);

            await expect(
                service.markUsedInTx(tx, 'passkey-one', 8, 'user-quartz')
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
        });
    });

    describe('assertRegistrable', () => {
        const response = {
            id: 'credential-new',
            rawId: 'credential-new',
            response: {
                clientDataJSON: buildClientDataJson('https://app.example.test'),
                attestationObject: 'attestation',
            },
            clientExtensionResults: {},
            type: 'public-key',
        } satisfies RegistrationResponseJSON;
        const publicKey = new Uint8Array([100, 101, 102, 251]);

        beforeEach(() => {
            featureFlagService.getMetadataNumber.mockResolvedValue(10);
            mfaPasskeyRepository.countByUserId.mockResolvedValue(2);
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue(null);
            vi.mocked(verifyRegistrationResponse).mockResolvedValue({
                verified: true,
                registrationInfo: {
                    credential: {
                        id: 'credential-new',
                        publicKey,
                        counter: 7,
                        transports: ['internal', 'hybrid'],
                    },
                    credentialDeviceType: 'multiDevice',
                    credentialBackedUp: true,
                },
            } as Awaited<ReturnType<typeof verifyRegistrationResponse>>);
        });

        it('verifies the attestation against the stored challenge, the response origin, and the relying party id', async () => {
            await service.assertRegistrable(
                'user-quartz',
                response,
                'challenge-stored'
            );

            expect(verifyRegistrationResponse).toHaveBeenCalledWith({
                response,
                expectedChallenge: 'challenge-stored',
                expectedOrigin: 'https://app.example.test',
                expectedRPID: 'example.test',
            });
        });

        it.each([
            ['an exact entry', 'https://app.other.test'],
            ['a label under a wildcard entry', 'https://app.example.test'],
            ['an android entry', 'android:apk-key-hash:x'],
        ])(
            'passes the response origin of %s to the library',
            async (_label, origin) => {
                await service.assertRegistrable(
                    'user-quartz',
                    {
                        ...response,
                        response: {
                            ...response.response,
                            clientDataJSON: buildClientDataJson(origin),
                        },
                    },
                    'challenge-stored'
                );

                expect(verifyRegistrationResponse).toHaveBeenCalledWith(
                    expect.objectContaining({ expectedOrigin: origin })
                );
            }
        );

        it.each([
            [
                'the wildcard domain itself',
                buildClientDataJson('https://example.test'),
            ],
            [
                'an origin outside every entry',
                buildClientDataJson('https://evil.test'),
            ],
            ['a clientDataJSON that is not base64url JSON', 'client-data'],
            [
                'a clientDataJSON with no origin',
                Buffer.from('{}').toString('base64url'),
            ],
        ])(
            'throws MfaPasskeyInvalidException without calling the library for %s',
            async (_label, clientDataJSON) => {
                await expect(
                    service.assertRegistrable(
                        'user-quartz',
                        {
                            ...response,
                            response: { ...response.response, clientDataJSON },
                        },
                        'challenge-stored'
                    )
                ).rejects.toMatchObject({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.passkeyInvalid,
                });

                expect(verifyRegistrationResponse).not.toHaveBeenCalled();
            }
        );

        describe('with the origin entry *', () => {
            beforeEach(async () => {
                stubConfigValues(configService, {
                    ...configValues,
                    'mfa.passkey.origins': ['*'],
                });
                service = await createMfaPasskeyService({
                    mfaPasskeyRepository,
                    configService,
                    featureFlagService,
                });
                vi.mocked(verifyRegistrationResponse).mockResolvedValue({
                    verified: true,
                    registrationInfo: {
                        credential: {
                            id: 'credential-new',
                            publicKey,
                            counter: 7,
                            transports: ['internal'],
                        },
                        credentialDeviceType: 'multiDevice',
                        credentialBackedUp: true,
                    },
                } as Awaited<ReturnType<typeof verifyRegistrationResponse>>);
            });

            it.each([
                ['an https origin', 'https://anything.test'],
                ['an origin with a port', 'http://localhost:3000'],
                ['an android origin', 'android:apk-key-hash:anything'],
            ])(
                'passes the response origin of %s to the library',
                async (_label, origin) => {
                    await service.assertRegistrable(
                        'user-quartz',
                        {
                            ...response,
                            response: {
                                ...response.response,
                                clientDataJSON: buildClientDataJson(origin),
                            },
                        },
                        'challenge-stored'
                    );

                    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
                        expect.objectContaining({ expectedOrigin: origin })
                    );
                }
            );

            it.each([
                [
                    'an origin that is not a URL',
                    buildClientDataJson('anything'),
                ],
                ['not base64url JSON', 'client-data'],
            ])(
                'throws MfaPasskeyInvalidException without calling the library for %s',
                async (_label, clientDataJSON) => {
                    await expect(
                        service.assertRegistrable(
                            'user-quartz',
                            {
                                ...response,
                                response: {
                                    ...response.response,
                                    clientDataJSON,
                                },
                            },
                            'challenge-stored'
                        )
                    ).rejects.toMatchObject({
                        module: 'mfa',
                        statusCode: EnumMfaStatusCodeError.passkeyInvalid,
                    });

                    expect(verifyRegistrationResponse).not.toHaveBeenCalled();
                }
            );
        });

        it('answers the credential id, the base64url public key, the counter, the transports, the device type, and the backed-up flag of the verified registration', async () => {
            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).resolves.toEqual({
                credentialId: 'credential-new',
                publicKey: 'ZGVm-w',
                counter: 7,
                transports: ['internal', 'hybrid'],
                deviceType: EnumMfaPasskeyDeviceType.multiDevice,
                backedUp: true,
            });

            expect(mfaPasskeyRepository.countByUserId).toHaveBeenCalledTimes(1);
            expect(mfaPasskeyRepository.countByUserId).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(
                mfaPasskeyRepository.findOneByCredentialId
            ).toHaveBeenCalledWith('credential-new');
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.passkeyMaxPerUser
            );
        });

        it('answers no transports when the library reports none', async () => {
            vi.mocked(verifyRegistrationResponse).mockResolvedValue({
                verified: true,
                registrationInfo: {
                    credential: {
                        id: 'credential-new',
                        publicKey,
                        counter: 0,
                    },
                    credentialDeviceType: 'singleDevice',
                    credentialBackedUp: false,
                },
            } as Awaited<ReturnType<typeof verifyRegistrationResponse>>);

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).resolves.toMatchObject({
                transports: [],
                deviceType: EnumMfaPasskeyDeviceType.singleDevice,
                backedUp: false,
                counter: 0,
            });
        });

        it('allows the passkey one below the passkeyMaxPerUser metadata', async () => {
            mfaPasskeyRepository.countByUserId.mockResolvedValue(9);

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).resolves.toMatchObject({ credentialId: 'credential-new' });
        });

        it('reads the cap, the count, and the attestation together', async () => {
            const cap = buildDeferred<number>();
            featureFlagService.getMetadataNumber.mockReturnValue(cap.promise);
            mfaPasskeyRepository.countByUserId.mockImplementation(async () => {
                cap.resolve(10);
                return 2;
            });

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).resolves.toMatchObject({ credentialId: 'credential-new' });
        });

        it('throws MfaPasskeyLimitException when the count equals the passkeyMaxPerUser metadata, reading no credential', async () => {
            mfaPasskeyRepository.countByUserId.mockResolvedValue(10);

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyLimit,
            });

            expect(
                mfaPasskeyRepository.findOneByCredentialId
            ).not.toHaveBeenCalled();
        });

        it('passes on the failure of the passkeyMaxPerUser read', async () => {
            const failure = new Error('flag unavailable');
            featureFlagService.getMetadataNumber.mockRejectedValue(failure);

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).rejects.toBe(failure);
        });

        it('throws MfaPasskeyInvalidException when the library does not verify the attestation, reading no credential', async () => {
            vi.mocked(verifyRegistrationResponse).mockResolvedValue({
                verified: false,
            });

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });

            expect(
                mfaPasskeyRepository.findOneByCredentialId
            ).not.toHaveBeenCalled();
        });

        it('throws MfaPasskeyInvalidException when the library throws', async () => {
            vi.mocked(verifyRegistrationResponse).mockRejectedValue(
                new Error('origin mismatch')
            );

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
        });

        it('throws MfaPasskeyAlreadyRegisteredException for a known credential id', async () => {
            mfaPasskeyRepository.findOneByCredentialId.mockResolvedValue(
                stored
            );

            await expect(
                service.assertRegistrable(
                    'user-quartz',
                    response,
                    'challenge-stored'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyAlreadyRegistered,
            });
        });
    });

    describe('registerInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const created: IMfaPasskey = {
            id: 'passkey-new',
            name: 'iPhone',
            deviceType: EnumMfaPasskeyDeviceType.multiDevice,
            backedUp: true,
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
            lastUsedAt: null,
        };
        const registration: IMfaPasskeyRegistration = {
            credentialId: 'credential-new',
            publicKey: 'ZGVm-w',
            counter: 7,
            transports: ['internal', 'hybrid'],
            deviceType: EnumMfaPasskeyDeviceType.multiDevice,
            backedUp: true,
        };

        it('stores the verified registration and the name for the user on the given tx, reading nothing, and answers the created passkey', async () => {
            mfaPasskeyRepository.createInTx.mockResolvedValue(created);

            await expect(
                service.registerInTx(tx, 'user-quartz', 'iPhone', registration)
            ).resolves.toBe(created);

            expect(mfaPasskeyRepository.createInTx).toHaveBeenCalledWith(tx, {
                userId: 'user-quartz',
                name: 'iPhone',
                ...registration,
            });
            expect(mfaPasskeyRepository.countByUserId).not.toHaveBeenCalled();
            expect(
                mfaPasskeyRepository.findOneByCredentialId
            ).not.toHaveBeenCalled();
        });
    });

    describe('getList', () => {
        it('answers the passkeys of the user', async () => {
            const passkeys: IMfaPasskey[] = [
                {
                    id: 'passkey-one',
                    name: 'iPhone',
                    deviceType: EnumMfaPasskeyDeviceType.multiDevice,
                    backedUp: true,
                    createdAt: new Date('2026-03-01T00:00:00.000Z'),
                    lastUsedAt: null,
                },
            ];
            mfaPasskeyRepository.findManyByUserId.mockResolvedValue(passkeys);

            await expect(service.getList('user-quartz')).resolves.toBe(
                passkeys
            );

            expect(mfaPasskeyRepository.findManyByUserId).toHaveBeenCalledWith(
                'user-quartz'
            );
        });
    });

    describe('existsByUser', () => {
        it('answers whether the user holds a passkey', async () => {
            mfaPasskeyRepository.existsByUserId.mockResolvedValue(true);

            await expect(service.existsByUser('user-quartz')).resolves.toBe(
                true
            );

            expect(mfaPasskeyRepository.existsByUserId).toHaveBeenCalledWith(
                'user-quartz'
            );
        });
    });

    describe('assertHasPasskey', () => {
        it('returns when the credentials are not empty, with no repository call', () => {
            expect(() =>
                service.assertHasPasskey([
                    { credentialId: 'credential-quartz', transports: [] },
                ])
            ).not.toThrow();

            expect(mfaPasskeyRepository.existsByUserId).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException for an empty array, with no repository call', () => {
            expect(() => service.assertHasPasskey([])).toThrowError(
                expect.objectContaining({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.methodUnavailable,
                })
            );
            expect(mfaPasskeyRepository.existsByUserId).not.toHaveBeenCalled();
        });
    });

    describe('existsByUserInTx', () => {
        it('answers whether the user holds a passkey on the given tx', async () => {
            const tx = {} as IDatabaseTransactionClient;
            mfaPasskeyRepository.existsByUserIdInTx.mockResolvedValue(false);

            await expect(
                service.existsByUserInTx(tx, 'user-quartz')
            ).resolves.toBe(false);

            expect(
                mfaPasskeyRepository.existsByUserIdInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz');
        });
    });

    describe('updateNameInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('renames a passkey of the user on the given tx', async () => {
            mfaPasskeyRepository.updateNameInTx.mockResolvedValue(true);

            await service.updateNameInTx(
                tx,
                'user-quartz',
                'passkey-one',
                'Laptop'
            );

            expect(mfaPasskeyRepository.updateNameInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'passkey-one',
                'Laptop'
            );
        });

        it('throws MfaPasskeyNotFoundException for the passkey of another user', async () => {
            mfaPasskeyRepository.updateNameInTx.mockResolvedValue(false);

            await expect(
                service.updateNameInTx(
                    tx,
                    'user-quartz',
                    'passkey-other',
                    'Laptop'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyNotFound,
            });
        });
    });

    describe('deleteInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('deletes a passkey of the user on the given tx', async () => {
            mfaPasskeyRepository.deleteInTx.mockResolvedValue(true);

            await service.deleteInTx(tx, 'user-quartz', 'passkey-one');

            expect(mfaPasskeyRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'passkey-one'
            );
        });

        it('throws MfaPasskeyNotFoundException for the passkey of another user', async () => {
            mfaPasskeyRepository.deleteInTx.mockResolvedValue(false);

            await expect(
                service.deleteInTx(tx, 'user-quartz', 'passkey-other')
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyNotFound,
            });
        });
    });

    describe('deleteByUserInTx', () => {
        it('deletes every passkey of the user on the given tx', async () => {
            const tx = {} as IDatabaseTransactionClient;

            await service.deleteByUserInTx(tx, 'user-quartz');

            expect(mfaPasskeyRepository.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });
    });
});
