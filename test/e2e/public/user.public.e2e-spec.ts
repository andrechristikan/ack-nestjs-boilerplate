import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2ePatch, e2ePost } from '@test/e2e/support/request';
import { withDefaultApiKey } from '@test/e2e/support/api-key';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    createEmailVerificationToken,
    createForgotPasswordToken,
    deleteUserFixture,
    enableTwoFactorForUser,
    generateTwoFactorCode,
    IE2eUserFixture,
} from '@test/e2e/support/user.fixture';

function device() {
    return {
        fingerprint: `e2e-fingerprint-${Date.now()}-${Math.random()}`,
    };
}

describe('User public auth routes', () => {
    const getApp = useE2eApp();

    describe('POST /api/v1/public/user/login/credential', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('logs in with valid credentials and returns a token pair', async () => {
            const response = await withDefaultApiKey(
                e2ePost(app, '/api/v1/public/user/login/credential')
            )
                .send({
                    email: user.email,
                    password: user.password,
                    from: 'website',
                    device: device(),
                })
                .expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    isTwoFactorEnable: false,
                    tokens: {
                        tokenType: expect.any(String),
                        accessToken: expect.any(String),
                        refreshToken: expect.any(String),
                    },
                },
            });
        });

        it('rejects the wrong password', async () => {
            const response = await withDefaultApiKey(
                e2ePost(app, '/api/v1/public/user/login/credential')
            )
                .send({
                    email: user.email,
                    password: 'WrongPassword1!',
                    from: 'website',
                    device: device(),
                })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
            });
        });

        it('rejects an email that does not resolve to a user', async () => {
            const response = await withDefaultApiKey(
                e2ePost(app, '/api/v1/public/user/login/credential')
            )
                .send({
                    email: `no-such-user-${Date.now()}@example.com`,
                    password: 'AnyPassword1!',
                    from: 'website',
                    device: device(),
                })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
            });
        });

        it('rejects a request with no x-api-key header', async () => {
            const response = await e2ePost(
                app,
                '/api/v1/public/user/login/credential'
            )
                .send({
                    email: user.email,
                    password: user.password,
                    from: 'website',
                    device: device(),
                })
                .expect(401);

            expect(response.body).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
            });
        });
    });

    describe('PATCH /api/v1/public/user/email/verify', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app, { isVerified: false });
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('verifies the email with a valid token and persists the verified state', async () => {
            const token = await createEmailVerificationToken(
                app,
                user.id,
                user.email
            );

            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/email/verify')
            )
                .send({ token })
                .expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
            });

            const prisma = getPrismaClient(app);
            const persisted = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });
            expect(persisted.isVerified).toBe(true);
            expect(persisted.verifiedAt).not.toBeNull();

            const verification = await prisma.verification.findFirst({
                where: { userId: user.id, type: 'email' },
                orderBy: { createdAt: 'desc' },
            });
            expect(verification?.isUsed).toBe(true);
        });

        it('rejects a token that does not resolve to a pending verification', async () => {
            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/email/verify')
            )
                .send({ token: 'not-a-real-verification-token' })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.tokenInvalid
                    ],
            });
        });

        it('rejects an empty token as a validation failure', async () => {
            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/email/verify')
            )
                .send({ token: '' })
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

        it('rejects a request with no x-api-key header', async () => {
            const response = await e2ePatch(
                app,
                '/api/v1/public/user/email/verify'
            )
                .send({ token: 'irrelevant' })
                .expect(401);

            expect(response.body).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
            });
        });
    });

    describe('PATCH /api/v1/public/user/password/reset', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('resets the password with a valid token and persists the new hash', async () => {
            const prisma = getPrismaClient(app);
            const before = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });

            const token = await createForgotPasswordToken(
                app,
                user.id,
                user.email
            );

            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/password/reset')
            )
                .send({ token, newPassword: 'NewPassw0rd!123' })
                .expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
            });

            const after = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });
            expect(after.password).not.toBe(before.password);

            const forgotPassword = await prisma.forgotPassword.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            expect(forgotPassword?.isUsed).toBe(true);
        });

        it('rejects a token that does not resolve to a pending reset', async () => {
            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/password/reset')
            )
                .send({
                    token: 'not-a-real-reset-token',
                    newPassword: 'NewPassw0rd!123',
                })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
            });
        });

        it('rejects a new password that fails the strength policy as a validation failure', async () => {
            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/password/reset')
            )
                .send({ token: 'irrelevant-token', newPassword: 'weak' })
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

        it('rejects a request with no x-api-key header', async () => {
            const response = await e2ePatch(
                app,
                '/api/v1/public/user/password/reset'
            )
                .send({ token: 'irrelevant', newPassword: 'NewPassw0rd!123' })
                .expect(401);

            expect(response.body).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
            });
        });
    });

    describe('PATCH /api/v1/public/user/login/2fa/verify', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let secret: string;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            const twoFactor = await enableTwoFactorForUser(
                app,
                user.id,
                user.email
            );
            secret = twoFactor.secret;
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        async function loginAndGetChallengeToken(): Promise<string> {
            const response = await withDefaultApiKey(
                e2ePost(app, '/api/v1/public/user/login/credential')
            )
                .send({
                    email: user.email,
                    password: user.password,
                    from: 'website',
                    device: device(),
                })
                .expect(200);

            expect(response.body.data.isTwoFactorEnable).toBe(true);

            return response.body.data.twoFactor.challengeToken;
        }

        it('completes the 2FA challenge with a valid TOTP code and issues a token pair', async () => {
            const challengeToken = await loginAndGetChallengeToken();
            const code = generateTwoFactorCode(app, secret);

            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/login/2fa/verify')
            )
                .send({ challengeToken, method: 'code', code })
                .expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    tokenType: expect.any(String),
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String),
                },
            });

            const replay = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/login/2fa/verify')
            ).send({ challengeToken, method: 'code', code });

            expect(replay.status).toBe(401);
            expect(replay.body).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorChallengeInvalid
                    ],
            });
        });

        it('rejects a challenge token that does not resolve to a pending challenge', async () => {
            const response = await withDefaultApiKey(
                e2ePatch(app, '/api/v1/public/user/login/2fa/verify')
            )
                .send({
                    challengeToken: 'not-a-real-challenge-token',
                    method: 'code',
                    code: '123456',
                })
                .expect(401);

            expect(response.body).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorChallengeInvalid
                    ],
            });
        });

        it('rejects a request with no x-api-key header', async () => {
            const response = await e2ePatch(
                app,
                '/api/v1/public/user/login/2fa/verify'
            )
                .send({
                    challengeToken: 'irrelevant',
                    method: 'code',
                    code: '123456',
                })
                .expect(401);

            expect(response.body).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
            });
        });
    });
});
