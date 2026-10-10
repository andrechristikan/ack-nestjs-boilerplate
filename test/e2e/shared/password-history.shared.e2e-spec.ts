import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet } from '@test/e2e/support/request';
import { loginActiveUser, withSharedAuth } from '@test/e2e/support/auth';
import {
    createActiveUser,
    deleteUserFixture,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';

describe('Password history shared routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/shared/user/password-history/list', () => {
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

        it("returns a paginated cursor list of the authenticated user's password history", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/password-history/list'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: expect.any(Array),
                metadata: expect.objectContaining({
                    type: 'cursor',
                }),
            });
        });
    });
});
