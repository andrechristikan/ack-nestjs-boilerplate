import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet, withWorkspace } from '@test/e2e/support/request';
import { loginActiveUser, withSharedAuth } from '@test/e2e/support/auth';
import {
    createActiveUser,
    deleteUserFixture,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';
import {
    addWorkspaceMember,
    createPublicWorkspace,
    deleteWorkspaceFixture,
} from '@test/e2e/support/workspace.fixture';
import type { Workspace } from '@generated/prisma-client';

describe('Activity log shared routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/shared/user/activity-log/list', () => {
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

        it("returns a paginated cursor list of the authenticated user's activity log", async () => {
            const response = await withSharedAuth(
                e2eGet(app, '/api/v1/shared/user/activity-log/list'),
                accessToken
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: expect.any(Array),
                metadata: expect.objectContaining({
                    type: 'cursor',
                }),
            });
            // the credential login that produced `accessToken` itself writes an activity-log
            // entry for this user, so the list is never empty for a freshly logged-in fixture
            expect(response.body.data.length).toBeGreaterThan(0);
            for (const entry of response.body.data) {
                expect(entry.userId).toBe(user.id);
            }
        });
    });

    describe('GET /api/v1/shared/user/activity-log/workspace/list', () => {
        let app: INestApplication;
        let user: IE2eUserFixture;
        let accessToken: string;
        let workspace: Workspace;

        beforeAll(async () => {
            app = getApp();
            user = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, user));
            workspace = await createPublicWorkspace(app, user.id);
            await addWorkspaceMember(app, workspace.id, user.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspace.id);
            await deleteUserFixture(app, user.id);
        });

        it('returns a paginated list of the activity log scoped to the workspace', async () => {
            const response = await withSharedAuth(
                withWorkspace(
                    e2eGet(
                        app,
                        '/api/v1/shared/user/activity-log/workspace/list'
                    ),
                    workspace.id
                ),
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
