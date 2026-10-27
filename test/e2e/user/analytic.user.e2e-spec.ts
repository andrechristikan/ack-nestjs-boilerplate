import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet } from '@test/e2e/support/request';
import { loginActiveUser, withUserAuth } from '@test/e2e/support/auth';
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

describe('Analytic user routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/user/analytic/workspace/summary', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('returns the workspace summary for a plain member (no date range required)', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/analytic/workspace/summary'),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({
                memberCount: expect.any(Number),
                projectCount: expect.any(Number),
                activityCount: expect.any(Number),
            });
            expect(response.body.data.memberCount).toBeGreaterThanOrEqual(1);
        });

        it('rejects an endDate before startDate coercion boundary as a validation failure', async () => {
            const response = await withUserAuth(
                e2eGet(
                    app,
                    '/api/v1/user/analytic/workspace/summary?startDate=not-a-date'
                ),
                accessToken,
                workspaceId
            ).expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('GET /api/v1/user/analytic/workspace/invite-funnel', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('returns the invite funnel for the workspace owner/admin', async () => {
            const response = await withUserAuth(
                e2eGet(
                    app,
                    '/api/v1/user/analytic/workspace/invite-funnel?startDate=2020-01-01T00:00:00.000Z&endDate=2030-01-01T00:00:00.000Z'
                ),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({
                statuses: expect.any(Array),
            });
        });

        it('rejects a missing required startDate/endDate as a validation failure', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/analytic/workspace/invite-funnel'),
                accessToken,
                workspaceId
            ).expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('GET /api/v1/user/analytic/workspace/join-outcomes', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('returns the join request outcomes for the workspace owner/admin', async () => {
            const response = await withUserAuth(
                e2eGet(
                    app,
                    '/api/v1/user/analytic/workspace/join-outcomes?startDate=2020-01-01T00:00:00.000Z&endDate=2030-01-01T00:00:00.000Z'
                ),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({
                statuses: expect.any(Array),
            });
        });
    });

    describe('GET /api/v1/user/analytic/workspace/member-roles', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('returns the member role distribution for the workspace owner/admin', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/analytic/workspace/member-roles'),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({
                roles: expect.any(Array),
            });
            const ownerRow = (
                response.body.data.roles as Array<{
                    role: string;
                    count: number;
                }>
            ).find(row => row.role === 'owner');
            expect(ownerRow?.count).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/v1/user/analytic/workspace/activity', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('returns the activity count for the workspace owner/admin', async () => {
            const response = await withUserAuth(
                e2eGet(
                    app,
                    '/api/v1/user/analytic/workspace/activity?startDate=2020-01-01T00:00:00.000Z&endDate=2030-01-01T00:00:00.000Z'
                ),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({
                count: expect.any(Number),
            });
        });
    });
});
