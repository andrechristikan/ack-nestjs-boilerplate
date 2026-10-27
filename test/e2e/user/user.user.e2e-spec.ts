import type { INestApplication } from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';

import { EnumUserStatus } from '@generated/prisma-client';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eDelete, withBearer } from '@test/e2e/support/request';
import { loginActiveUser } from '@test/e2e/support/auth';
import { withDefaultApiKey } from '@test/e2e/support/api-key';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    deleteUserFixture,
} from '@test/e2e/support/user.fixture';

describe('User user routes', () => {
    const getApp = useE2eApp();

    describe('DELETE /api/v1/user/user/self/delete', () => {
        let app: INestApplication;

        beforeAll(() => {
            app = getApp();
        });

        it("soft-deletes the caller's own account and persists the state", async () => {
            const user = await createActiveUser(app);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                await withDefaultApiKey(
                    withBearer(
                        e2eDelete(app, '/api/v1/user/user/self/delete'),
                        accessToken
                    )
                ).expect(200);

                const prisma = getPrismaClient(app);
                const persisted = await prisma.user.findUniqueOrThrow({
                    where: { id: user.id },
                });
                expect(persisted.deletedAt).not.toBeNull();
                expect(persisted.status).toBe(EnumUserStatus.inactive);
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });

        it('rejects a second delete once the account is already soft-deleted', async () => {
            const user = await createActiveUser(app);
            const { accessToken } = await loginActiveUser(app, user);

            try {
                await withDefaultApiKey(
                    withBearer(
                        e2eDelete(app, '/api/v1/user/user/self/delete'),
                        accessToken
                    )
                ).expect(200);

                // Same access token; the underlying session was revoked and the account
                // deleted by the first call, so a repeat call is rejected before the
                // handler's business logic runs again.
                const response = await withDefaultApiKey(
                    withBearer(
                        e2eDelete(app, '/api/v1/user/user/self/delete'),
                        accessToken
                    )
                );
                expect(response.status).toBeGreaterThanOrEqual(400);
            } finally {
                await deleteUserFixture(app, user.id);
            }
        });
    });
});
