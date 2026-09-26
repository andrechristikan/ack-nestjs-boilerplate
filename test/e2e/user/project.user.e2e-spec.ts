import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { useE2eApp } from '@test/e2e/support/app';
import {
    e2eDelete,
    e2eGet,
    e2ePatch,
    e2ePost,
    e2ePut,
} from '@test/e2e/support/request';
import { loginActiveUser, withUserAuth } from '@test/e2e/support/auth';
import { getPrismaClient } from '@test/e2e/support/prisma';
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
import {
    addProjectMember,
    createWorkspaceProject,
} from '@test/e2e/support/project.fixture';

describe('Project user routes', () => {
    const getApp = useE2eApp();

    describe('GET /api/v1/user/project/list', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('lists projects in the current workspace (workspace owner sees all)', async () => {
            const response = await withUserAuth(
                e2eGet(app, '/api/v1/user/project/list'),
                accessToken,
                workspaceId
            ).expect(200);

            const ids = (response.body.data as Array<{ id: string }>).map(
                row => row.id
            );
            expect(ids).toContain(projectId);
        });
    });

    describe('POST /api/v1/user/project/create', () => {
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

        it('creates a project in the current workspace and persists it', async () => {
            const name = `E2E Created Project ${Date.now()}`;

            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/project/create'),
                accessToken,
                workspaceId
            )
                .send({ name })
                .expect(201);

            expect(response.body.data).toMatchObject({ name, workspaceId });

            const persisted = await getPrismaClient(
                app
            ).project.findUniqueOrThrow({
                where: { id: response.body.data.id },
            });
            expect(persisted.workspaceId).toBe(workspaceId);
        });

        it('rejects a name over the 150-character limit as a validation failure', async () => {
            const response = await withUserAuth(
                e2ePost(app, '/api/v1/user/project/create'),
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

    describe('GET /api/v1/user/project/get/:projectId', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('returns a project by id', async () => {
            const response = await withUserAuth(
                e2eGet(app, `/api/v1/user/project/get/${projectId}`),
                accessToken,
                workspaceId
            ).expect(200);

            expect(response.body.data).toMatchObject({ id: projectId });
        });

        it('404s for a project id that does not belong to the current workspace', async () => {
            const response = await withUserAuth(
                e2eGet(
                    app,
                    '/api/v1/user/project/get/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e'
                ),
                accessToken,
                workspaceId
            ).expect(404);

            expect(response.body).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.notFound
                    ],
            });
        });
    });

    describe('PUT /api/v1/user/project/update/:projectId', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('updates the project name/description and persists it', async () => {
            const name = `E2E Updated Project ${Date.now()}`;

            await withUserAuth(
                e2ePut(app, `/api/v1/user/project/update/${projectId}`),
                accessToken,
                workspaceId
            )
                .send({ name, description: 'Updated description' })
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).project.findUniqueOrThrow({ where: { id: projectId } });
            expect(persisted.name).toBe(name);
        });
    });

    describe('PATCH /api/v1/user/project/update/:projectId/slug', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;
        let otherSlug: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;

            otherSlug = `e2e-taken-${Date.now().toString(36)}`;
            await createWorkspaceProject(app, workspaceId, owner.id, {
                slug: otherSlug,
            });
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('updates the project slug and persists it', async () => {
            const slug = `e2e-new-${Date.now().toString(36)}`;

            await withUserAuth(
                e2ePatch(app, `/api/v1/user/project/update/${projectId}/slug`),
                accessToken,
                workspaceId
            )
                .send({ slug })
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).project.findUniqueOrThrow({ where: { id: projectId } });
            expect(persisted.slug).toBe(slug);
        });

        it('rejects a slug already used by another project in the same workspace', async () => {
            const response = await withUserAuth(
                e2ePatch(app, `/api/v1/user/project/update/${projectId}/slug`),
                accessToken,
                workspaceId
            )
                .send({ slug: otherSlug })
                .expect(400);

            expect(response.body).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugAlreadyExists
                    ],
            });
        });
    });

    describe('DELETE /api/v1/user/project/delete/:projectId', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('soft-deletes the project and persists the deletion', async () => {
            await withUserAuth(
                e2eDelete(app, `/api/v1/user/project/delete/${projectId}`),
                accessToken,
                workspaceId
            ).expect(200);

            const persisted = await getPrismaClient(
                app
            ).project.findUniqueOrThrow({ where: { id: projectId } });
            expect(persisted.deletedAt).not.toBeNull();
        });
    });

    describe('GET /api/v1/user/project/member/:projectId/list', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
            await addProjectMember(app, projectId, owner.id);
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('lists members of the project', async () => {
            const response = await withUserAuth(
                e2eGet(app, `/api/v1/user/project/member/${projectId}/list`),
                accessToken,
                workspaceId
            ).expect(200);

            const userIds = (
                response.body.data as Array<{ userId: string }>
            ).map(row => row.userId);
            expect(userIds).toContain(owner.id);
        });
    });

    describe('POST /api/v1/user/project/member/:projectId/assign', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let member: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            member = await createActiveUser(app);
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
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
            await deleteUserFixture(app, member.id);
        });

        it('assigns a workspace member to the project and persists the ProjectMember row', async () => {
            const response = await withUserAuth(
                e2ePost(app, `/api/v1/user/project/member/${projectId}/assign`),
                accessToken,
                workspaceId
            )
                .send({
                    userId: member.id,
                    role: EnumProjectMemberRole.member,
                })
                .expect(201);

            expect(response.body.data).toMatchObject({
                projectId,
                userId: member.id,
                role: EnumProjectMemberRole.member,
            });
            const persisted = await getPrismaClient(
                app
            ).projectMember.findFirstOrThrow({
                where: { projectId, userId: member.id },
            });
            expect(persisted.role).toBe(EnumProjectMemberRole.member);
        });

        it('rejects assigning a user who is already a project member', async () => {
            const already = await createActiveUser(app);
            await addWorkspaceMember(
                app,
                workspaceId,
                already.id,
                EnumWorkspaceMemberRole.member
            );
            await addProjectMember(
                app,
                projectId,
                already.id,
                EnumProjectMemberRole.member
            );

            try {
                const response = await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/project/member/${projectId}/assign`
                    ),
                    accessToken,
                    workspaceId
                )
                    .send({
                        userId: already.id,
                        role: EnumProjectMemberRole.member,
                    })
                    .expect(400);

                expect(response.body).toMatchObject({
                    module: 'project',
                    statusCode:
                        EnumProjectStatusCodeError.memberAlreadyAssigned,
                    statusCodeKey:
                        EnumProjectStatusCodeError[
                            EnumProjectStatusCodeError.memberAlreadyAssigned
                        ],
                });
            } finally {
                await deleteUserFixture(app, already.id);
            }
        });

        it('404s when the target user is not a member of the workspace', async () => {
            const outsider = await createActiveUser(app);

            try {
                const response = await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/project/member/${projectId}/assign`
                    ),
                    accessToken,
                    workspaceId
                )
                    .send({
                        userId: outsider.id,
                        role: EnumProjectMemberRole.member,
                    })
                    .expect(404);

                expect(response.body).toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                });
                const persisted = await getPrismaClient(
                    app
                ).projectMember.findFirst({
                    where: { projectId, userId: outsider.id },
                });
                expect(persisted).toBeNull();
            } finally {
                await deleteUserFixture(app, outsider.id);
            }
        });

        it('rejects a non-UUID userId as a validation failure', async () => {
            const response = await withUserAuth(
                e2ePost(app, `/api/v1/user/project/member/${projectId}/assign`),
                accessToken,
                workspaceId
            )
                .send({
                    userId: 'not-a-uuid',
                    role: EnumProjectMemberRole.member,
                })
                .expect(422);

            expect(response.body).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
            });
        });
    });

    describe('PATCH /api/v1/user/project/member/:projectId/:projectMemberId/role/update', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let member: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            member = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
            await deleteUserFixture(app, member.id);
        });

        it("updates a project member's role and persists it", async () => {
            const projectMember = await addProjectMember(
                app,
                projectId,
                member.id,
                EnumProjectMemberRole.member
            );

            await withUserAuth(
                e2ePatch(
                    app,
                    `/api/v1/user/project/member/${projectId}/${projectMember.id}/role/update`
                ),
                accessToken,
                workspaceId
            )
                .send({ role: EnumProjectMemberRole.viewer })
                .expect(200);

            const persisted = await getPrismaClient(
                app
            ).projectMember.findUniqueOrThrow({
                where: { id: projectMember.id },
            });
            expect(persisted.role).toBe(EnumProjectMemberRole.viewer);
        });

        it('404s for a project member id that does not belong to the project', async () => {
            const response = await withUserAuth(
                e2ePatch(
                    app,
                    `/api/v1/user/project/member/${projectId}/019547f2-3b26-7c86-9c63-3e9e6b2b6a4e/role/update`
                ),
                accessToken,
                workspaceId
            )
                .send({ role: EnumProjectMemberRole.viewer })
                .expect(404);

            expect(response.body).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
            });
        });
    });

    describe('DELETE /api/v1/user/project/member/:projectId/:projectMemberId/remove', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let member: IE2eUserFixture;
        let accessToken: string;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            member = await createActiveUser(app);
            ({ accessToken } = await loginActiveUser(app, owner));
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
            await deleteUserFixture(app, member.id);
        });

        it('removes a project member and persists the deletion', async () => {
            const projectMember = await addProjectMember(
                app,
                projectId,
                member.id,
                EnumProjectMemberRole.member
            );

            await withUserAuth(
                e2eDelete(
                    app,
                    `/api/v1/user/project/member/${projectId}/${projectMember.id}/remove`
                ),
                accessToken,
                workspaceId
            ).expect(200);

            const persisted = await getPrismaClient(
                app
            ).projectMember.findUnique({ where: { id: projectMember.id } });
            expect(persisted).toBeNull();
        });
    });

    describe('POST /api/v1/user/project/member/:projectId/leave', () => {
        let app: INestApplication;
        let owner: IE2eUserFixture;
        let workspaceId: string;
        let projectId: string;

        beforeAll(async () => {
            app = getApp();
            owner = await createActiveUser(app);
            const workspace = await createPublicWorkspace(app, owner.id);
            workspaceId = workspace.id;
            await addWorkspaceMember(app, workspaceId, owner.id);
            const project = await createWorkspaceProject(
                app,
                workspaceId,
                owner.id
            );
            projectId = project.id;
        });

        afterAll(async () => {
            await deleteWorkspaceFixture(app, workspaceId);
            await deleteUserFixture(app, owner.id);
        });

        it('lets a project member leave and persists the removal', async () => {
            const member = await createActiveUser(app);
            await addWorkspaceMember(
                app,
                workspaceId,
                member.id,
                EnumWorkspaceMemberRole.member
            );
            const projectMember = await addProjectMember(
                app,
                projectId,
                member.id,
                EnumProjectMemberRole.member
            );
            const { accessToken: memberToken } = await loginActiveUser(
                app,
                member
            );

            try {
                await withUserAuth(
                    e2ePost(
                        app,
                        `/api/v1/user/project/member/${projectId}/leave`
                    ),
                    memberToken,
                    workspaceId
                ).expect(200);

                const persisted = await getPrismaClient(
                    app
                ).projectMember.findUnique({
                    where: { id: projectMember.id },
                });
                expect(persisted).toBeNull();
            } finally {
                await deleteUserFixture(app, member.id);
            }
        });
    });
});
