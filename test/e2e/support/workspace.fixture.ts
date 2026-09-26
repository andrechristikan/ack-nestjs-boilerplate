import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import {
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import type {
    Workspace,
    WorkspaceInvite,
    WorkspaceJoinRequest,
} from '@generated/prisma-client';
import { getPrismaClient } from '@test/e2e/support/prisma';

/**
 * Creates a real, public (`isPublic: true`), non-deleted workspace directly through the app's
 * Prisma client — the fixture the public preview-by-slug route needs.
 */
export async function createPublicWorkspace(
    app: INestApplication,
    ownerUserId: string,
    overrides?: Partial<{ name: string; slug: string; isPublic: boolean }>
): Promise<Workspace> {
    const prisma = getPrismaClient(app);
    const suffix = randomUUID().replaceAll('-', '').slice(0, 16);

    return prisma.workspace.create({
        data: {
            name: overrides?.name ?? `E2E Workspace ${suffix}`,
            slug: overrides?.slug ?? `e2e-workspace-${suffix}`,
            description: 'E2E fixture workspace',
            isPublic: overrides?.isPublic ?? true,
            createdBy: ownerUserId,
        },
    });
}

/**
 * Persists a real, pending workspace invite and returns the RAW invite token a spec sends to
 * the public invite-preview route.
 */
export async function createWorkspaceInvite(
    app: INestApplication,
    workspaceId: string,
    invitedByUserId: string,
    email: string,
    overrides?: Partial<{
        workspaceRole: EnumWorkspaceMemberRole;
        expiredAt: Date;
    }>
): Promise<{ invite: WorkspaceInvite; token: string }> {
    const prisma = getPrismaClient(app);
    const helperHashService = app.get(HelperHashService);

    const token = randomUUID().replaceAll('-', '');
    const hashedToken = helperHashService.sha256Hash(token);

    const invite = await prisma.workspaceInvite.create({
        data: {
            workspaceId,
            email,
            workspaceRole:
                overrides?.workspaceRole ?? EnumWorkspaceMemberRole.member,
            token: hashedToken,
            reference: `E2E-${randomUUID().slice(0, 8)}`,
            expiredAt:
                overrides?.expiredAt ?? new Date(Date.now() + 60 * 60 * 1000),
            invitedByUserId,
            createdBy: invitedByUserId,
        },
    });

    return { invite, token };
}

/**
 * Adds a real `WorkspaceMember` row directly through the app's Prisma client.
 * `createPublicWorkspace` only sets `createdBy` on the workspace row — it does not itself
 * create a membership — so a spec whose route requires the caller to be a member (guarded by
 * `WorkspaceMemberProtected`) adds one explicitly with this helper.
 */
export async function addWorkspaceMember(
    app: INestApplication,
    workspaceId: string,
    userId: string,
    role: EnumWorkspaceMemberRole = EnumWorkspaceMemberRole.owner
): Promise<void> {
    const prisma = getPrismaClient(app);

    await prisma.workspaceMember.create({
        data: {
            workspaceId,
            userId,
            role,
            createdBy: userId,
        },
    });
}

/**
 * Persists a real, pending `WorkspaceJoinRequest` row directly through the app's Prisma client.
 * Specs exercising accept/reject/list seed the pending row directly instead of going through
 * the create route, so each spec controls the requester and workspace state it needs.
 */
export async function createWorkspaceJoinRequestFixture(
    app: INestApplication,
    workspaceId: string,
    userId: string,
    overrides?: Partial<{ message: string }>
): Promise<WorkspaceJoinRequest> {
    const prisma = getPrismaClient(app);

    return prisma.workspaceJoinRequest.create({
        data: {
            workspaceId,
            userId,
            status: EnumWorkspaceJoinRequestStatus.pending,
            message: overrides?.message,
            createdBy: userId,
        },
    });
}

/**
 * Deletes the fixture workspace — the state cleanup a spec runs in `afterAll` so a slug or
 * token it created never leaks into another spec's assertions. Invites, members and projects
 * go with it through the schema's `onDelete: Cascade`.
 */
export async function deleteWorkspaceFixture(
    app: INestApplication,
    workspaceId: string
): Promise<void> {
    await getPrismaClient(app).workspace.deleteMany({
        where: { id: workspaceId },
    });
}
