import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import {
    e2eDelete,
    e2eGet,
    e2ePatch,
    e2ePost,
    e2ePut,
    withBearer,
} from '@test/e2e/support/request';
import {
    e2eDevice,
    loginActiveUser,
    withSharedAuth,
} from '@test/e2e/support/auth';
import { withDefaultApiKey } from '@test/e2e/support/api-key';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    createDisabledTwoFactorFixture,
    createMobileNumberFixture,
    deleteUserFixture,
    enableTwoFactorForUser,
    generateTwoFactorCode,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';

/** Completes a 2FA-enabled account's login and returns a usable access token. */
async function loginTwoFactorUser(
    app: INestApplication,
    user: IE2eUserFixture,
    secret: string
): Promise<string> {
    const loginResponse = await withDefaultApiKey(
        e2ePost(app, '/api/v1/public/user/login/credential')
    )
        .send({
            email: user.email,
            password: user.password,
            from: 'website',
            device: e2eDevice(),
        })
        .expect(200);

    const challengeToken = loginResponse.body.data.twoFactor.challengeToken;
    const code = generateTwoFactorCode(app, secret);

    const verifyResponse = await withDefaultApiKey(
        e2ePatch(app, '/api/v1/public/user/login/2fa/verify')
    )
        .send({ challengeToken, method: 'code', code })
        .expect(200);

    return verifyResponse.body.data.accessToken;
}

describe('User shared routes', () => {
    const getApp = useE2eApp();

    describe('POST /api/v1/shared/user/refresh', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('returns a new token pair for a valid refresh token', async () => {
            const { refreshToken } = await loginActiveUser(app, user);

            const response = await withDefaultApiKey(
                withBearer(
                    e2ePost(app, '/api/v1/shared/user/refresh'),
                    refreshToken
                )
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    tokenType: expect.any(String),
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String),
                },
            });
        });
    });

    describe('GET /api/v1/shared/user/profile/get', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it("returns the authenticated user's profile", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/profile/get'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    country: expect.any(Object),
                    mobileNumbers: expect.any(Array),
                },
            });
        });
    });

    describe('PUT /api/v1/shared/user/profile/update', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('updates the profile and persists name, gender and country', async () => {
            const country = await getPrismaClient(app).country.findFirstOrThrow(
                {
                    where: { alpha2Code: 'ID' },
                }
            );

            await withSharedAuth(
                e2ePut(app, '/api/v1/shared/user/profile/update'),
                accessToken
            )
                .send({
                    name: 'E2E Updated Name',
                    countryId: country.id,
                    gender: 'female',
                })
                .expect(200);

            const persisted = await getPrismaClient(app).user.findUniqueOrThrow(
                { where: { id: user.id } }
            );
            expect(persisted).toMatchObject({
                name: 'E2E Updated Name',
                countryId: country.id,
                gender: 'female',
            });
        });

        it('404s when the country does not exist', async () => {
            const response = await withSharedAuth(
                e2ePut(app, '/api/v1/shared/user/profile/update'),
                accessToken
            )
                .send({
                    name: 'E2E Updated Name',
                    countryId: randomUUID(),
                    gender: 'male',
                })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                statusCodeKey:
                    EnumCountryStatusCodeError[
                        EnumCountryStatusCodeError.notFound
                    ],
            });
        });

        it('rejects an invalid gender as a validation failure', async () => {
            const country = await getPrismaClient(app).country.findFirstOrThrow(
                {
                    where: { alpha2Code: 'ID' },
                }
            );

            const response = await withSharedAuth(
                e2ePut(app, '/api/v1/shared/user/profile/update'),
                accessToken
            )
                .send({
                    name: 'E2E Updated Name',
                    countryId: country.id,
                    gender: 'not-a-real-gender',
                })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
            });
        });

        it('rejects a non-UUID countryId as a validation failure', async () => {
            const response = await withSharedAuth(
                e2ePut(app, '/api/v1/shared/user/profile/update'),
                accessToken
            )
                .send({
                    name: 'E2E Updated Name',
                    countryId: 'not-a-uuid',
                    gender: 'male',
                })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('POST /api/v1/user/profile/photo/presign/generate', () => {
        it.todo(
            'returns a presigned S3 upload URL for a valid extension and size'
        );
        it.todo(
            'rejects an unsupported file extension as a validation failure'
        );
    });

    describe('POST /api/v1/user/profile/photo/upload', () => {
        it.todo('uploads the photo to S3 and persists the profile photo');
        it.todo('rejects a file that exceeds the allowed size or extension');
    });

    describe('PUT /api/v1/shared/user/profile/photo/update', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        // CONFIRMED src/ DEFECT (see hand-back): `AwsS3Service.mapPresign`
        // (src/common/aws/services/aws.s3.service.ts:1018-1041) is the only presign-shaped method
        // on that service missing the `isInitialized()` guard every sibling method has (e.g.
        // `presignPutItem` at src/common/aws/services/aws.s3.service.ts:905-916, which returns
        // `null` gracefully so the domain can throw `AwsServiceUnavailableException`). With no S3
        // credentials configured (this e2e profile's AWS_S3_* vars are intentionally empty —
        // S3 is a disabled boundary here), `mapPresign` calls `getConfig()`
        // (src/common/aws/services/aws.s3.service.ts:202-212), which throws a raw `Error`.
        // `UserProfileDomain.updatePhotoProfile`'s catch-all then wraps that into
        // `AppUnknownException`, and the route 500s for every payload, real or not — a success
        // case cannot be demonstrated against current code/environment.
        it('500s because mapPresign has no isInitialized guard with S3 disabled (confirmed src/ defect)', async () => {
            const key = `users/${user.id}/profile/e2e-photo.jpg`;

            const response = await withSharedAuth(
                e2ePut(app, '/api/v1/shared/user/profile/photo/update'),
                accessToken
            )
                .send({ key, size: 1024 })
                .expect(500);

            expect(response.body).toMatchObject({
                module: 'app',
            });
        });

        it('rejects an invalid payload as a validation failure', async () => {
            const response = await withSharedAuth(
                e2ePut(app, '/api/v1/shared/user/profile/photo/update'),
                accessToken
            )
                .send({ key: '', size: 1024 })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
            });
        });
    });

    describe('PATCH /api/v1/user/password/change', () => {
        it.todo('changes the password and persists the new hash');
        it.todo('rejects the wrong current password');
    });

    describe('POST /api/v1/shared/user/mobile-number/add', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('adds a mobile number and persists it', async () => {
            const country = await getPrismaClient(app).country.findFirstOrThrow(
                {
                    where: { alpha2Code: 'ID' },
                }
            );
            const number = `8${randomUUID().replaceAll(/\D/g, '').padEnd(9, '1').slice(0, 9)}`;

            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/mobile-number/add'),
                accessToken
            )
                .send({ countryId: country.id, number, phoneCode: '62' })
                .expect(201);

            expect(response.body.data).toMatchObject({
                number,
                phoneCode: '62',
            });
            const persisted = await getPrismaClient(
                app
            ).userMobileNumber.findFirstOrThrow({
                where: { userId: user.id, number },
            });
            expect(persisted).toMatchObject({
                countryId: country.id,
                phoneCode: '62',
                isVerified: false,
            });
        });

        it('rejects a mobile number the user already has', async () => {
            const existing = await createMobileNumberFixture(app, user.id);

            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/mobile-number/add'),
                accessToken
            )
                .send({
                    countryId: existing.countryId,
                    number: existing.number,
                    phoneCode: existing.phoneCode,
                })
                .expect(409);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
            });
        });

        it('rejects a phone code the country does not own', async () => {
            const country = await getPrismaClient(app).country.findFirstOrThrow(
                {
                    where: { alpha2Code: 'ID' },
                }
            );

            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/mobile-number/add'),
                accessToken
            )
                .send({
                    countryId: country.id,
                    number: '81234567891',
                    phoneCode: '999',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberInvalid
                    ],
            });
        });

        it('404s when the country does not exist', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/mobile-number/add'),
                accessToken
            )
                .send({
                    countryId: randomUUID(),
                    number: '81234567892',
                    phoneCode: '62',
                })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
        });

        it('rejects a non-UUID countryId as a validation failure', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/mobile-number/add'),
                accessToken
            )
                .send({
                    countryId: 'not-a-uuid',
                    number: '81234567893',
                    phoneCode: '62',
                })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('PUT /api/v1/shared/user/mobile-number/:mobileNumberId/update', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('updates the mobile number, resets verification and persists it', async () => {
            const mobileNumber = await createMobileNumberFixture(app, user.id);
            const number = `8${randomUUID().replaceAll(/\D/g, '').padEnd(9, '2').slice(0, 9)}`;

            const response = await withSharedAuth(
                e2ePut(
                    app,
                    `/api/v1/shared/user/mobile-number/${mobileNumber.id}/update`
                ),
                accessToken
            )
                .send({
                    countryId: mobileNumber.countryId,
                    number,
                    phoneCode: mobileNumber.phoneCode,
                })
                .expect(200);

            expect(response.body.data).toMatchObject({
                id: mobileNumber.id,
                number,
            });
            const persisted = await getPrismaClient(
                app
            ).userMobileNumber.findUniqueOrThrow({
                where: { id: mobileNumber.id },
            });
            expect(persisted.number).toBe(number);
            expect(persisted.isVerified).toBe(false);
        });

        it('404s for a mobile number id that does not belong to the user', async () => {
            const response = await withSharedAuth(
                e2ePut(
                    app,
                    `/api/v1/shared/user/mobile-number/${randomUUID()}/update`
                ),
                accessToken
            )
                .send({
                    countryId: (
                        await getPrismaClient(app).country.findFirstOrThrow({
                            where: { alpha2Code: 'ID' },
                        })
                    ).id,
                    number: '81234567894',
                    phoneCode: '62',
                })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
            });
        });

        it('rejects updating to a number the user already has', async () => {
            const first = await createMobileNumberFixture(app, user.id);
            const second = await createMobileNumberFixture(app, user.id);

            const response = await withSharedAuth(
                e2ePut(
                    app,
                    `/api/v1/shared/user/mobile-number/${second.id}/update`
                ),
                accessToken
            )
                .send({
                    countryId: first.countryId,
                    number: first.number,
                    phoneCode: first.phoneCode,
                })
                .expect(409);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
            });
        });

        it('rejects a non-UUID countryId as a validation failure', async () => {
            const mobileNumber = await createMobileNumberFixture(app, user.id);

            const response = await withSharedAuth(
                e2ePut(
                    app,
                    `/api/v1/shared/user/mobile-number/${mobileNumber.id}/update`
                ),
                accessToken
            )
                .send({
                    countryId: 'not-a-uuid',
                    number: '81234567895',
                    phoneCode: '62',
                })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('DELETE /api/v1/shared/user/mobile-number/:mobileNumberId/delete', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('removes the mobile number and persists the deletion', async () => {
            const mobileNumber = await createMobileNumberFixture(app, user.id);

            const response = await withSharedAuth(
                e2eDelete(
                    app,
                    `/api/v1/shared/user/mobile-number/${mobileNumber.id}/delete`
                ),
                accessToken
            ).expect(200);

            expect(response.body.data).toMatchObject({ id: mobileNumber.id });

            const prisma = getPrismaClient(app);
            const persisted = await prisma.userMobileNumber.findUnique({
                where: { id: mobileNumber.id },
            });
            expect(persisted).toBeNull();
        });

        it('404s for a mobile number id that does not belong to the user', async () => {
            const response = await withSharedAuth(
                e2eDelete(
                    app,
                    '/api/v1/shared/user/mobile-number/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e/delete'
                ),
                accessToken
            ).expect(404);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
            });
        });
    });

    describe('POST /api/v1/shared/user/username/claim', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;
        let otherUser: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            otherUser = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
            await deleteUserFixture(app, otherUser.id);
        });

        it('claims the username and persists it on the user', async () => {
            const username = `e2eclaim${Date.now()}`;

            await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/username/claim'),
                accessToken
            )
                .send({ username })
                .expect(200);

            const prisma = getPrismaClient(app);
            const persisted = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });
            expect(persisted.username).toBe(username);
        });

        it('rejects a username already claimed by another user', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/username/claim'),
                accessToken
            )
                .send({ username: otherUser.username })
                .expect(409);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
            });
        });
    });

    describe('GET /api/v1/shared/user/2fa/status/get', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            await createDisabledTwoFactorFixture(app, user.id);
            ({ accessToken } = await loginActiveUser(app, user));
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it("returns the authenticated user's two-factor status", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/2fa/status/get'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    isEnabled: false,
                    isPendingConfirmation: false,
                    backupCodesRemaining: 0,
                },
            });
        });
    });

    describe('POST /api/v1/shared/user/2fa/setup', () => {
        it('returns a two-factor secret and provisioning data', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            await createDisabledTwoFactorFixture(app, user.id);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/shared/user/2fa/setup'),
                    accessToken
                )
                    .send({})
                    .expect(200);

                expect(response.body).toMatchObject({
                    message: expect.any(String),
                    data: {
                        secret: expect.any(String),
                        otpauthUrl: expect.any(String),
                    },
                });

                const prisma = getPrismaClient(app);
                const persisted = await prisma.twoFactor.findUniqueOrThrow({
                    where: { userId: user.id },
                });
                expect(persisted.pendingSecret).not.toBeNull();
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });

        it('rejects a request when two-factor is already enabled', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            const { secret } = await enableTwoFactorForUser(
                app,
                user.id,
                user.email
            );
            const accessToken = await loginTwoFactorUser(app, user, secret);

            try {
                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/shared/user/2fa/setup'),
                    accessToken
                )
                    .send({})
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'auth',
                    statusCode:
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorBackupCodeRequired
                        ],
                });
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });
    });

    describe('POST /api/v1/shared/user/2fa/enable', () => {
        it('enables two-factor with a valid code and persists the state', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            await createDisabledTwoFactorFixture(app, user.id);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                const setupResponse = await withSharedAuth(
                    e2ePost(app, '/api/v1/shared/user/2fa/setup'),
                    accessToken
                )
                    .send({})
                    .expect(200);
                const code = generateTwoFactorCode(
                    app,
                    setupResponse.body.data.secret
                );

                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/shared/user/2fa/enable'),
                    accessToken
                )
                    .send({ code })
                    .expect(200);

                expect(response.body).toMatchObject({
                    message: expect.any(String),
                    data: { backupCodes: expect.any(Array) },
                });
                expect(response.body.data.backupCodes.length).toBeGreaterThan(
                    0
                );

                const prisma = getPrismaClient(app);
                const persisted = await prisma.twoFactor.findUniqueOrThrow({
                    where: { userId: user.id },
                });
                expect(persisted.enabled).toBe(true);
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });

        it('rejects an invalid code', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            await createDisabledTwoFactorFixture(app, user.id);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                await withSharedAuth(
                    e2ePost(app, '/api/v1/shared/user/2fa/setup'),
                    accessToken
                )
                    .send({})
                    .expect(200);

                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/shared/user/2fa/enable'),
                    accessToken
                )
                    .send({ code: '000000' })
                    .expect(401);

                expect(response.body).toMatchObject({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorInvalid
                        ],
                });
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });
    });

    describe('DELETE /api/v1/shared/user/2fa/disable', () => {
        it('disables two-factor and persists the state', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            const { secret } = await enableTwoFactorForUser(
                app,
                user.id,
                user.email
            );
            const accessToken = await loginTwoFactorUser(app, user, secret);

            try {
                const code = generateTwoFactorCode(app, secret);

                await withSharedAuth(
                    e2eDelete(app, '/api/v1/shared/user/2fa/disable'),
                    accessToken
                )
                    .send({ method: 'code', code })
                    .expect(200);

                const prisma = getPrismaClient(app);
                const persisted = await prisma.twoFactor.findUniqueOrThrow({
                    where: { userId: user.id },
                });
                expect(persisted.enabled).toBe(false);
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });

        it('rejects a request when two-factor is not enabled', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            await createDisabledTwoFactorFixture(app, user.id);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                const response = await withSharedAuth(
                    e2eDelete(app, '/api/v1/shared/user/2fa/disable'),
                    accessToken
                )
                    .send({ method: 'code', code: '000000' })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorNotEnabled
                        ],
                });
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });
    });

    describe('POST /api/v1/shared/user/2fa/backup-code/regenerate', () => {
        it('regenerates the backup codes and persists the new set', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            const { secret } = await enableTwoFactorForUser(
                app,
                user.id,
                user.email
            );
            const accessToken = await loginTwoFactorUser(app, user, secret);

            try {
                const prisma = getPrismaClient(app);
                const before = await prisma.twoFactorBackupCode.findMany({
                    where: { twoFactor: { userId: user.id } },
                });

                const code = generateTwoFactorCode(app, secret);
                const response = await withSharedAuth(
                    e2ePost(
                        app,
                        '/api/v1/shared/user/2fa/backup-code/regenerate'
                    ),
                    accessToken
                )
                    .send({ code })
                    // no `@HttpCode` override on this route (see
                    // `UserSharedController#regenerateTwoFactorBackupCodes`), so Nest's default
                    // `@Post` status applies.
                    .expect(201);

                expect(response.body).toMatchObject({
                    message: expect.any(String),
                    data: { backupCodes: expect.any(Array) },
                });

                const after = await prisma.twoFactorBackupCode.findMany({
                    where: { twoFactor: { userId: user.id } },
                });
                const beforeHashes = new Set(
                    before.map(entry => entry.codeHash)
                );
                expect(
                    after.some(entry => !beforeHashes.has(entry.codeHash))
                ).toBe(true);
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });

        it('rejects a request when two-factor is not enabled', async () => {
            const app = getApp();
            const user = await createActiveUser(app);
            await createDisabledTwoFactorFixture(app, user.id);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                const response = await withSharedAuth(
                    e2ePost(
                        app,
                        '/api/v1/shared/user/2fa/backup-code/regenerate'
                    ),
                    accessToken
                )
                    .send({ code: '000000' })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.twoFactorNotEnabled
                        ],
                });
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });
    });

    describe('POST /api/v1/shared/user/logout', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('revokes the session and clears the device notification token', async () => {
            const { accessToken } = await loginActiveUser(app, user);
            const prisma = getPrismaClient(app);
            const session = await prisma.session.findFirstOrThrow({
                where: { userId: user.id, isRevoked: false },
                include: { deviceOwnership: true },
            });
            await prisma.device.update({
                where: { id: session.deviceOwnership.deviceId },
                data: {
                    notificationToken: 'e2e-notification-token',
                    notificationProvider: 'fcm',
                },
            });

            await withSharedAuth(
                e2ePost(app, '/api/v1/shared/user/logout'),
                accessToken
            ).expect(200);

            const revoked = await prisma.session.findUniqueOrThrow({
                where: { id: session.id },
            });
            expect(revoked.isRevoked).toBe(true);
            expect(revoked.revokedAt).not.toBeNull();
            const device = await prisma.device.findUniqueOrThrow({
                where: { id: session.deviceOwnership.deviceId },
            });
            expect(device.notificationToken).toBeNull();
            expect(device.notificationProvider).toBeNull();
        });
    });
});
