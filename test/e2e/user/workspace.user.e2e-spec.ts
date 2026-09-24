import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import {
    e2eDelete,
    e2eGet,
    e2ePatch,
    e2ePost,
    e2ePut,
} from '@test/e2e/support/request';
import {
    loginActiveUser,
    withSharedAuth,
    withUserAuth,
} from '@test/e2e/support/auth';
import { getPrismaClient } from '@test/e2e/support/prisma';
import {
    createActiveUser,
    deleteUserFixture,
    type IE2eUserFixture,
} from '@test/e2e/support/user.fixture';
import {
    addWorkspaceMember,
    createPublicWorkspace,
    createWorkspaceInvite,
    createWorkspaceJoinRequestFixture,
    deleteWorkspaceFixture,
} from '@test/e2e/support/workspace.fixture';

describe('Workspace user routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/user/workspace/list', () => {
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

        it('lists workspaces the caller is a member of', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/workspace/list'),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body).toMatchObject({
                message: expect.any(String),
                data: expect.any(Array),
            });
            const ids = (response.body.data as Array<{ id: string }>).map(
                row => row.id
            );
            expect(ids).toContain(workspaceId);
        });
    });

    describe('POST /api/v1/user/workspace/create', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let anyWorkspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const seedWorkspace = await createPublicWorkspace(app, owner.id);
            anyWorkspaceId = seedWorkspace.id;
            await addWorkspaceMember(app, anyWorkspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, anyWorkspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('creates a workspace and persists the caller as owner', async () => {
            const name = `E2E Created Workspace ${Date.now()}`;

            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/create'),
                accessToken,
                anyWorkspaceId
            )
                .send({ name })
                .expect(201);

            expect(response.body.data).toMatchObject({ name });
            const createdId = response.body.data.id as string;

            try {
                const prisma = getPrismaClient(app);
                const member = await prisma.workspaceMember.findUniqueOrThrow({
                    where: {
                        workspaceId_userId: {
                            workspaceId: createdId,
                            userId: owner.id,
                        },
                    },
                });
                expect(member.role).toBe(EnumWorkspaceMemberRole.owner);
            } finally {
                await deleteWorkspaceFixture(app, createdId);
            }
        });

        it('rejects creating an 11th owned workspace once the per-user cap is reached', async () => {
            const capWorkspaceIds: string[] = [];
            // `owner` already owns 1 (the seed workspace); create 9 more to reach the
            // configured cap of 10 (`workspace.maxWorkspacesPerUser`).
            for (let i = 0; i < 9; i += 1) {
                const workspace = await createPublicWorkspace(app, owner.id);
                await addWorkspaceMember(app, workspace.id, owner.id);
                capWorkspaceIds.push(workspace.id);
            }

            try {
                const response = await withUserAuth(
                    e2ePost(app, '/api/v1/user/workspace/create'),
                    accessToken,
                    anyWorkspaceId
                )
                    .send({ name: 'E2E Over Cap Workspace' })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.capReached,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.capReached
                        ],
                });
            } finally {
                for (const id of capWorkspaceIds) {
                    await deleteWorkspaceFixture(app, id);
                }
            }
        });
    });

    describe('GET /api/v1/user/workspace/get', () => {
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

        it('returns the current workspace (resolved from x-workspace-id)', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/workspace/get'),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({ id: workspaceId });
        });

        it('404s when x-workspace-id names a soft-deleted workspace', async () => {
            const deletedWorkspace = await createPublicWorkspace(app, owner.id);
            await addWorkspaceMember(app, deletedWorkspace.id, owner.id);
            await getPrismaClient(app).workspace.update({
                where: { id: deletedWorkspace.id },
                data: { deletedAt: new Date() },
            });

            try {
                const response = await withUserAuth(
                    e2eGet(app, '/api/v1/user/workspace/get'),
                    accessToken,
                    deletedWorkspace.id
                ).expect(404);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.notFound,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.notFound
                        ],
                });
            } finally {
                await deleteWorkspaceFixture(app, deletedWorkspace.id);
            }
        });
    });

    describe('PUT /api/v1/user/workspace/update', () => {
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

        it('updates the workspace name/description and persists it', async () => {
            const name = `E2E Updated Name ${Date.now()}`;

            await withUserAuth(
                e2ePut(app, '/api/v1/user/workspace/update'),
                accessToken,
                workspaceId
            )
                .send({ name, description: 'Updated description' })
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).workspace.findUniqueOrThrow({ where: { id: workspaceId } });
            expect(persisted.name).toBe(name);
        });

        it('rejects a name over the 150-character limit as a validation failure', async () => {
            const response = await withUserAuth(
                e2ePut(app, '/api/v1/user/workspace/update'),
                accessToken,
                workspaceId
            )
                .send({ name: 'x'.repeat(151) })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('PATCH /api/v1/user/workspace/update/is-public', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id, {
                isPublic: false,
            });
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('updates workspace visibility and persists it', async () => {
            await withUserAuth(
                e2ePatch(app, '/api/v1/user/workspace/update/is-public'),
                accessToken,
                workspaceId
            )
                .send({ isPublic: true })
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).workspace.findUniqueOrThrow({ where: { id: workspaceId } });
            expect(persisted.isPublic).toBe(true);
        });
    });

    describe('PATCH /api/v1/user/workspace/update/slug', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let otherWorkspaceId: string;
        let otherSlug: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);

            otherSlug = `e2e-taken-slug-${Date.now()}`;
            const otherWorkspace = await createPublicWorkspace(app, owner.id, {
                slug: otherSlug,
            });
            otherWorkspaceId = otherWorkspace.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteWorkspaceFixture(app, otherWorkspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('updates the workspace slug and persists it', async () => {
            const slug = `e2e-new-slug-${Date.now()}`;

            await withUserAuth(
                e2ePatch(app, '/api/v1/user/workspace/update/slug'),
                accessToken,
                workspaceId
            )
                .send({ slug })
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).workspace.findUniqueOrThrow({ where: { id: workspaceId } });
            expect(persisted.slug).toBe(slug);
        });

        it('rejects a slug already used by another workspace', async () => {
            const response = await withUserAuth(
                e2ePatch(app, '/api/v1/user/workspace/update/slug'),
                accessToken,
                workspaceId
            )
                .send({ slug: otherSlug })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugAlreadyExists
                    ],
            });
        });
    });

    describe('POST /api/v1/user/workspace/switch', () => {
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

        it('switches the active workspace and persists lastWorkspaceId', async () => {
            const target = await createPublicWorkspace(app, owner.id);
            await addWorkspaceMember(app, target.id, owner.id);

            try {
                await withUserAuth(
                    e2ePost(app, '/api/v1/user/workspace/switch'),
                    accessToken,
                    workspaceId
                )
                    .send({ workspaceId: target.id })
                    .expect(200);

                const persisted = await getPrismaClient(
                    app
                ).user.findUniqueOrThrow({ where: { id: owner.id } });
                expect(persisted.lastWorkspaceId).toBe(target.id);
            } finally {
                await deleteWorkspaceFixture(app, target.id);
            }
        });

        it('rejects switching to a workspace the caller is not a member of', async () => {
            const stranger = await createActiveUser(app);
            const foreign = await createPublicWorkspace(app, stranger.id);
            await addWorkspaceMember(app, foreign.id, stranger.id);

            try {
                const response = await withUserAuth(
                    e2ePost(app, '/api/v1/user/workspace/switch'),
                    accessToken,
                    workspaceId
                )
                    .send({ workspaceId: foreign.id })
                    .expect(403);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.memberForbidden
                        ],
                });
            } finally {
                await deleteWorkspaceFixture(app, foreign.id);
                await deleteUserFixture(app, stranger.id);
            }
        });

        it('404s when the target workspace does not exist', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/switch'),
                accessToken,
                workspaceId
            )
                .send({ workspaceId: randomUUID() })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('rejects a non-UUID workspaceId as a validation failure', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/switch'),
                accessToken,
                workspaceId
            )
                .send({ workspaceId: 'not-a-uuid' })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('POST /api/v1/user/workspace/ownership/transfer', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let member: IE2eUserFixture;
        let outsider: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let failWorkspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            member = await createActiveUser(app);
            outsider = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            await addWorkspaceMember(
                app,
                workspaceId,
                member.id,
                EnumWorkspaceMemberRole.member
            );
            // Separate workspace for the failure cases: the success case demotes the caller.
            const failWorkspace = await createPublicWorkspace(app, owner.id);
            failWorkspaceId = failWorkspace.id;
            await addWorkspaceMember(app, failWorkspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteWorkspaceFixture(app, failWorkspaceId);
            await deleteUserFixture(app, owner.id);
            await deleteUserFixture(app, member.id);
            await deleteUserFixture(app, outsider.id);
        });

        it('transfers ownership to a member and demotes the caller to admin', async () => {
            await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/ownership/transfer'),
                accessToken,
                workspaceId
            )
                .send({ targetUserId: member.id })
                .expect(200);

            const prisma = getPrismaClient(app);
            const [ownerRow, memberRow] = await Promise.all([
                prisma.workspaceMember.findUniqueOrThrow({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: owner.id,
                        },
                    },
                }),
                prisma.workspaceMember.findUniqueOrThrow({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: member.id,
                        },
                    },
                }),
            ]);
            expect(ownerRow.role).toBe(EnumWorkspaceMemberRole.admin);
            expect(memberRow.role).toBe(EnumWorkspaceMemberRole.owner);
        });

        it('rejects transferring ownership to oneself', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/ownership/transfer'),
                accessToken,
                failWorkspaceId
            )
                .send({ targetUserId: owner.id })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.selfTransfer
                    ],
            });
        });

        it('404s when the target user is not a member of the workspace', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/ownership/transfer'),
                accessToken,
                failWorkspaceId
            )
                .send({ targetUserId: outsider.id })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
            });
        });

        it('rejects a non-UUID targetUserId as a validation failure', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/ownership/transfer'),
                accessToken,
                failWorkspaceId
            )
                .send({ targetUserId: 'not-a-uuid' })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('POST /api/v1/user/workspace/leave', () => {
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

        it('rejects the sole owner leaving the workspace', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/leave'),
                accessToken,
                workspaceId
            ).expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.lastOwner,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.lastOwner
                    ],
            });
        });

        it('lets a non-owner member leave and persists the removal', async () => {
            const member = await createActiveUser(app);
            await addWorkspaceMember(
                app,
                workspaceId,
                member.id,
                EnumWorkspaceMemberRole.member
            );
            const { accessToken: memberToken } = await loginActiveUser(
                app,
                member
            );

            try {
                await withUserAuth(
                    e2ePost(app, '/api/v1/user/workspace/leave'),
                    memberToken,
                    workspaceId
                ).expect(200);

                const persisted = await getPrismaClient(
                    app
                ).workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: member.id,
                        },
                    },
                });
                expect(persisted).toBeNull();
            } finally {
                await deleteUserFixture(app, member.id);
            }
        });
    });

    describe('DELETE /api/v1/user/workspace/delete', () => {
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

        it('soft-deletes the workspace and persists the deletion', async () => {
            await withUserAuth(
                e2eDelete(app, '/api/v1/user/workspace/delete'),
                accessToken,
                workspaceId
            ).expect(200);

            const persisted = await getPrismaClient(
                app
            ).workspace.findUniqueOrThrow({ where: { id: workspaceId } });
            expect(persisted.deletedAt).not.toBeNull();
        });
    });

    describe('GET /api/v1/user/workspace/member/list', () => {
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

        it('lists members of the current workspace', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/workspace/member/list'),
                accessToken,
                workspaceId
            ).expect(200);

            const userIds = (
                response.body.data as Array<{ userId: string }>
            ).map(row => row.userId);
            expect(userIds).toContain(owner.id);
        });
    });

    describe('PATCH /api/v1/user/workspace/member/:workspaceMemberId/role/update', () => {
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

        it("updates a member's role and persists it", async () => {
            const member = await createActiveUser(app);
            await addWorkspaceMember(
                app,
                workspaceId,
                member.id,
                EnumWorkspaceMemberRole.member
            );
            const memberId = (
                await getPrismaClient(app).workspaceMember.findUniqueOrThrow({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: member.id,
                        },
                    },
                })
            ).id;

            try {
                await withUserAuth(
                    e2ePatch(
                        app,
                        `/api/v1/user/workspace/member/${memberId}/role/update`
                    ),
                    accessToken,
                    workspaceId
                )
                    .send({ role: EnumWorkspaceMemberRole.admin })
                    .expect(200);

                const persisted = await getPrismaClient(
                    app
                ).workspaceMember.findUniqueOrThrow({
                    where: { id: memberId },
                });
                expect(persisted.role).toBe(EnumWorkspaceMemberRole.admin);
            } finally {
                await deleteUserFixture(app, member.id);
            }
        });

        it('404s for a member id that does not belong to the workspace', async () => {
            const response = await withUserAuth(
                e2ePatch(
                    app,
                    '/api/v1/user/workspace/member/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e/role/update'
                ),
                accessToken,
                workspaceId
            )
                .send({ role: EnumWorkspaceMemberRole.admin })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
            });
        });
    });

    describe('DELETE /api/v1/user/workspace/member/:workspaceMemberId/remove', () => {
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

        it('removes a member and persists the deletion', async () => {
            const member = await createActiveUser(app);
            await addWorkspaceMember(
                app,
                workspaceId,
                member.id,
                EnumWorkspaceMemberRole.member
            );
            const memberId = (
                await getPrismaClient(app).workspaceMember.findUniqueOrThrow({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: member.id,
                        },
                    },
                })
            ).id;

            try {
                await withUserAuth(
                    e2eDelete(
                        app,
                        `/api/v1/user/workspace/member/${memberId}/remove`
                    ),
                    accessToken,
                    workspaceId
                ).expect(200);

                const persisted = await getPrismaClient(
                    app
                ).workspaceMember.findUnique({ where: { id: memberId } });
                expect(persisted).toBeNull();
            } finally {
                await deleteUserFixture(app, member.id);
            }
        });
    });

    describe('GET /api/v1/user/workspace/invite/list', () => {
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

        it('lists invites for the current workspace', async () => {
            const { invite } = await createWorkspaceInvite(
                app,
                workspaceId,
                owner.id,
                `e2e.invitee.${Date.now()}@example.com`
            );

            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/workspace/invite/list'),
                accessToken,
                workspaceId
            ).expect(200);

            const ids = (response.body.data as Array<{ id: string }>).map(
                row => row.id
            );
            expect(ids).toContain(invite.id);
        });
    });

    describe('POST /api/v1/user/workspace/invite/create', () => {
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

        it('creates a pending invite and persists it', async () => {
            const email = `e2e.new-invite.${Date.now()}@example.com`;

            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/invite/create'),
                accessToken,
                workspaceId
            )
                .send({
                    email,
                    workspaceRole: EnumWorkspaceMemberRole.member,
                })
                .expect(201);

            expect(response.body.data).toMatchObject({ email });

            const persisted = await getPrismaClient(
                app
            ).workspaceInvite.findUniqueOrThrow({
                where: { id: response.body.data.id },
            });
            expect(persisted.workspaceId).toBe(workspaceId);
        });

        it('rejects a duplicate pending invite for the same email', async () => {
            const email = `e2e.dup-invite.${Date.now()}@example.com`;

            await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/invite/create'),
                accessToken,
                workspaceId
            )
                .send({
                    email,
                    workspaceRole: EnumWorkspaceMemberRole.member,
                })
                .expect(201);

            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/invite/create'),
                accessToken,
                workspaceId
            )
                .send({
                    email,
                    workspaceRole: EnumWorkspaceMemberRole.member,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteDuplicate
                    ],
            });
        });
    });

    describe('POST /api/v1/user/workspace/invite/:workspaceInviteId/resend', () => {
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

        it('rotates the invite token and persists the new hash', async () => {
            const { invite } = await createWorkspaceInvite(
                app,
                workspaceId,
                owner.id,
                `e2e.resend.${Date.now()}@example.com`
            );

            await withUserAuth(
                e2ePost(
                    app,
                    `/api/v1/user/workspace/invite/${invite.id}/resend`
                ),
                accessToken,
                workspaceId
            )
                .send({})
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).workspaceInvite.findUniqueOrThrow({ where: { id: invite.id } });
            expect(persisted.token).not.toBe(invite.token);
        });

        it('404s for an invite id that does not belong to the workspace', async () => {
            const response = await withUserAuth(
                e2ePost(
                    app,
                    '/api/v1/user/workspace/invite/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e/resend'
                ),
                accessToken,
                workspaceId
            )
                .send({})
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteNotFound
                    ],
            });
        });

        it('rejects resending an already-revoked invite', async () => {
            const { invite } = await createWorkspaceInvite(
                app,
                workspaceId,
                owner.id,
                `e2e.resend-revoked.${Date.now()}@example.com`
            );
            await withUserAuth(
                e2eDelete(
                    app,
                    `/api/v1/user/workspace/invite/${invite.id}/revoke`
                ),
                accessToken,
                workspaceId
            ).expect(200);

            const response = await withUserAuth(
                e2ePost(
                    app,
                    `/api/v1/user/workspace/invite/${invite.id}/resend`
                ),
                accessToken,
                workspaceId
            )
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteAlreadyProcessed
                    ],
            });
        });
    });

    describe('DELETE /api/v1/user/workspace/invite/:workspaceInviteId/revoke', () => {
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

        it('revokes a pending invite and persists the status', async () => {
            const { invite } = await createWorkspaceInvite(
                app,
                workspaceId,
                owner.id,
                `e2e.revoke.${Date.now()}@example.com`
            );

            await withUserAuth(
                e2eDelete(
                    app,
                    `/api/v1/user/workspace/invite/${invite.id}/revoke`
                ),
                accessToken,
                workspaceId
            ).expect(200);

            const persisted = await getPrismaClient(
                app
            ).workspaceInvite.findUniqueOrThrow({ where: { id: invite.id } });
            expect(persisted.status).not.toBe('pending');
        });

        it('rejects revoking an already-revoked invite', async () => {
            const { invite } = await createWorkspaceInvite(
                app,
                workspaceId,
                owner.id,
                `e2e.revoke-twice.${Date.now()}@example.com`
            );
            await withUserAuth(
                e2eDelete(
                    app,
                    `/api/v1/user/workspace/invite/${invite.id}/revoke`
                ),
                accessToken,
                workspaceId
            ).expect(200);

            const response = await withUserAuth(
                e2eDelete(
                    app,
                    `/api/v1/user/workspace/invite/${invite.id}/revoke`
                ),
                accessToken,
                workspaceId
            ).expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteAlreadyProcessed
                    ],
            });
        });
    });

    describe('POST /api/v1/user/workspace/invite/claim', () => {
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

        it('claims a pending invite and persists the new membership', async () => {
            const invitee = await createActiveUser(app);
            const { token } = await createWorkspaceInvite(
                app,
                workspaceId,
                owner.id,
                invitee.email
            );
            const { accessToken: inviteeToken } = await loginActiveUser(
                app,
                invitee
            );

            try {
                await withUserAuth(
                    e2ePost(app, '/api/v1/user/workspace/invite/claim'),
                    inviteeToken,
                    workspaceId
                )
                    .send({ inviteToken: token })
                    .expect(200);

                const persisted = await getPrismaClient(
                    app
                ).workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: invitee.id,
                        },
                    },
                });
                expect(persisted).not.toBeNull();
            } finally {
                await deleteUserFixture(app, invitee.id);
            }
        });

        it('rejects an invalid/unknown invite token', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/workspace/invite/claim'),
                accessToken,
                workspaceId
            )
                .send({ inviteToken: 'not-a-real-token' })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
            });
        });
    });

    describe('POST /api/v1/user/workspace/join-request/create', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id, {
                isPublic: true,
            });
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('creates a pending join request and persists it', async () => {
            const requester = await createActiveUser(app);
            const { accessToken: requesterToken } = await loginActiveUser(
                app,
                requester
            );

            try {
                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/user/workspace/join-request/create'),
                    requesterToken
                )
                    .send({ workspaceId, message: 'please let me in' })
                    .expect(201);

                expect(response.body.data).toMatchObject({
                    workspaceId,
                    userId: requester.id,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                });
                const persisted = await getPrismaClient(
                    app
                ).workspaceJoinRequest.findFirstOrThrow({
                    where: { workspaceId, userId: requester.id },
                });
                expect(persisted.status).toBe(
                    EnumWorkspaceJoinRequestStatus.pending
                );
                expect(persisted.message).toBe('please let me in');
            } finally {
                await deleteUserFixture(app, requester.id);
            }
        });

        it('rejects a duplicate pending join request', async () => {
            const requester = await createActiveUser(app);
            await createWorkspaceJoinRequestFixture(
                app,
                workspaceId,
                requester.id
            );
            const { accessToken: requesterToken } = await loginActiveUser(
                app,
                requester
            );

            try {
                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/user/workspace/join-request/create'),
                    requesterToken
                )
                    .send({ workspaceId })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.joinRequestDuplicate,
                });
            } finally {
                await deleteUserFixture(app, requester.id);
            }
        });

        it('rejects a join request to a workspace the caller already belongs to', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/user/workspace/join-request/create'),
                accessToken
            )
                .send({ workspaceId })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyMember,
            });
        });

        it('rejects a join request to a private workspace', async () => {
            const requester = await createActiveUser(app);
            const privateWorkspace = await createPublicWorkspace(
                app,
                owner.id,
                { isPublic: false }
            );
            const { accessToken: requesterToken } = await loginActiveUser(
                app,
                requester
            );

            try {
                const response = await withSharedAuth(
                    e2ePost(app, '/api/v1/user/workspace/join-request/create'),
                    requesterToken
                )
                    .send({ workspaceId: privateWorkspace.id })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.notPublic,
                });
            } finally {
                await deleteWorkspaceFixture(app, privateWorkspace.id);
                await deleteUserFixture(app, requester.id);
            }
        });

        it('404s when the workspace does not exist', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/user/workspace/join-request/create'),
                accessToken
            )
                .send({ workspaceId: randomUUID() })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('rejects a non-UUID workspaceId as a validation failure', async () => {
            const response = await withSharedAuth(
                e2ePost(app, '/api/v1/user/workspace/join-request/create'),
                accessToken
            )
                .send({ workspaceId: 'not-a-uuid' })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('GET /api/v1/user/workspace/join-request/list', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let requester: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            requester = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
            await deleteUserFixture(app, requester.id);
        });

        it('lists join requests for the current workspace', async () => {
            const joinRequest = await createWorkspaceJoinRequestFixture(
                app,
                workspaceId,
                requester.id
            );

            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/workspace/join-request/list'),
                accessToken,
                workspaceId
            ).expect(200);

            const ids = (response.body.data as Array<{ id: string }>).map(
                row => row.id
            );
            expect(ids).toContain(joinRequest.id);
        });
    });

    describe('POST /api/v1/user/workspace/join-request/:workspaceJoinRequestId/accept', () => {
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

        it('accepts a pending join request and persists the new membership', async () => {
            const requester = await createActiveUser(app);
            const joinRequest = await createWorkspaceJoinRequestFixture(
                app,
                workspaceId,
                requester.id
            );

            try {
                await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/workspace/join-request/${joinRequest.id}/accept`
                    ),
                    accessToken,
                    workspaceId
                ).expect(200);

                const member = await getPrismaClient(
                    app
                ).workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId: requester.id,
                        },
                    },
                });
                expect(member).not.toBeNull();
            } finally {
                await deleteUserFixture(app, requester.id);
            }
        });

        it('rejects accepting the same join request twice', async () => {
            const requester = await createActiveUser(app);
            const joinRequest = await createWorkspaceJoinRequestFixture(
                app,
                workspaceId,
                requester.id
            );

            try {
                await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/workspace/join-request/${joinRequest.id}/accept`
                    ),
                    accessToken,
                    workspaceId
                ).expect(200);

                const response = await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/workspace/join-request/${joinRequest.id}/accept`
                    ),
                    accessToken,
                    workspaceId
                ).expect(400);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError
                                .joinRequestAlreadyProcessed
                        ],
                });
            } finally {
                await deleteUserFixture(app, requester.id);
            }
        });
    });

    describe('POST /api/v1/user/workspace/join-request/:workspaceJoinRequestId/reject', () => {
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

        it('rejects a pending join request and persists the outcome', async () => {
            const requester = await createActiveUser(app);
            const joinRequest = await createWorkspaceJoinRequestFixture(
                app,
                workspaceId,
                requester.id
            );

            try {
                await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/workspace/join-request/${joinRequest.id}/reject`
                    ),
                    accessToken,
                    workspaceId
                )
                    .send({
                        rejectReasonCode:
                            EnumWorkspaceJoinRejectReason.wrongWorkspace,
                    })
                    .expect(200);

                const persisted = await getPrismaClient(
                    app
                ).workspaceJoinRequest.findUniqueOrThrow({
                    where: { id: joinRequest.id },
                });
                expect(persisted.status).not.toBe('pending');
            } finally {
                await deleteUserFixture(app, requester.id);
            }
        });

        it('rejects rejecting the same join request twice', async () => {
            const requester = await createActiveUser(app);
            const joinRequest = await createWorkspaceJoinRequestFixture(
                app,
                workspaceId,
                requester.id
            );

            try {
                await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/workspace/join-request/${joinRequest.id}/reject`
                    ),
                    accessToken,
                    workspaceId
                )
                    .send({
                        rejectReasonCode:
                            EnumWorkspaceJoinRejectReason.wrongWorkspace,
                    })
                    .expect(200);

                const response = await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/workspace/join-request/${joinRequest.id}/reject`
                    ),
                    accessToken,
                    workspaceId
                )
                    .send({
                        rejectReasonCode:
                            EnumWorkspaceJoinRejectReason.wrongWorkspace,
                    })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError
                                .joinRequestAlreadyProcessed
                        ],
                });
            } finally {
                await deleteUserFixture(app, requester.id);
            }
        });
    });
});
