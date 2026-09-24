import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eDelete, e2eGet } from '@test/e2e/support/request';
import { loginActiveUser, withSharedAuth } from '@test/e2e/support/auth';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    deleteUserFixture,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';

describe('Session shared routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/shared/user/session/list', () => {
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

        it("returns a paginated cursor list of the authenticated user's active sessions", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/session/list'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: expect.any(Array),
                metadata: expect.objectContaining({
                    type: 'cursor',
                }),
            });
            // the credential login that produced `accessToken` itself creates the session row
            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('DELETE /api/v1/shared/user/session/revoke/:sessionId', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
        });

        afterAll(async () => {
            await deleteUserFixture(app, user.id);
        });

        it('revokes the session and persists the revocation', async () => {
            // its own login — revoking the session behind this token would break a second
            // assertion reusing it, since revoke purges the session cache the access-guard
            // checks on every request
            const { accessToken } = await loginActiveUser(app, user);

            const list = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/session/list'),
                accessToken
            ).expect(200);
            const sessionId = list.body.data[0].id as string;

            await withSharedAuth(
                e2eDelete(
                    app,
                    `/api/v1/shared/user/session/revoke/${sessionId}`
                ),
                accessToken
            ).expect(200);

            const prisma = getPrismaClient(app);
            const persisted = await prisma.session.findUniqueOrThrow({
                where: { id: sessionId },
            });
            expect(persisted.revokedAt).not.toBeNull();
        });

        it('404s for a session id that does not belong to the user', async () => {
            const { accessToken } = await loginActiveUser(app, user);

            const response = await withSharedAuth(
                e2eDelete(
                    app,
                    '/api/v1/shared/user/session/revoke/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e'
                ),
                accessToken
            ).expect(404);

            expect(response.body).toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
            });
        });
    });
});
