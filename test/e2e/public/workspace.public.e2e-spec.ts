import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import { e2eGet } from '@test/e2e/support/request';
import { withDefaultApiKey } from '@test/e2e/support/api-key';
import {
    createActiveUser,
    deleteUserFixture,
    IE2eUserFixture,
} from '@test/e2e/support/user.fixture';
import {
    createPublicWorkspace,
    createWorkspaceInvite,
    deleteWorkspaceFixture,
} from '@test/e2e/support/workspace.fixture';
import { INestApplication } from '@nestjs/common';
import { Workspace } from '@generated/prisma-client';

describe('Workspace public preview routes', () => {
    const getApp = useE2eApp();
    let app: INestApplication;
    let owner: IE2eUserFixture;
    let workspace: Workspace;

    beforeAll(async () => {
        app = getApp();
        owner = await createActiveUser(app);
        workspace = await createPublicWorkspace(app, owner.id);
    });

    afterAll(async () => {
        await deleteWorkspaceFixture(app, workspace.id);
        await deleteUserFixture(app, owner.id);
    });

    describe('GET /api/v1/public/workspace/preview/:slug', () => {
        it('returns the public workspace profile for its slug', async () => {
            const response = await withDefaultApiKey(
                e2eGet(
                    app,
                    `/api/v1/public/workspace/preview/${workspace.slug}`
                )
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    id: workspace.id,
                    slug: workspace.slug,
                    name: workspace.name,
                },
            });
            expect(response.body.data).not.toHaveProperty('createdBy');
            expect(response.body.data).not.toHaveProperty('isPublic');
        });

        it('404s for a slug that does not resolve to a public workspace', async () => {
            const response = await withDefaultApiKey(
                e2eGet(
                    app,
                    `/api/v1/public/workspace/preview/no-such-slug-${Date.now()}`
                )
            ).expect(404);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
            });
        });

        it('rejects a request with no x-api-key header', async () => {
            const response = await e2eGet(
                app,
                `/api/v1/public/workspace/preview/${workspace.slug}`
            ).expect(401);

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

    describe('GET /api/v1/public/workspace/invite/:inviteToken/preview', () => {
        it('returns the invite preview for a pending invite token', async () => {
            const { token } = await createWorkspaceInvite(
                app,
                workspace.id,
                owner.id,
                `invitee.${Date.now()}@example.com`
            );

            const response = await withDefaultApiKey(
                e2eGet(app, `/api/v1/public/workspace/invite/${token}/preview`)
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: {
                    workspaceName: workspace.name,
                    workspaceRole: 'member',
                    expiredAt: expect.any(String),
                },
            });
        });

        it('rejects an invite token that does not resolve to a pending invite', async () => {
            const response = await withDefaultApiKey(
                e2eGet(
                    app,
                    '/api/v1/public/workspace/invite/not-a-real-token/preview'
                )
            ).expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
            });
        });

        it('rejects a request with no x-api-key header', async () => {
            const response = await e2eGet(
                app,
                '/api/v1/public/workspace/invite/not-a-real-token/preview'
            ).expect(401);

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
