import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import type { Project, ProjectMember } from '@generated/prisma-client';
import { getPrismaClient } from '@test/e2e/support/prisma';

/**
 * Creates a real `Project` row directly through the app's Prisma client, scoped to a workspace
 * fixture already created — the fixture every `project.user` route needs, since a project is
 * always workspace-scoped.
 */
export async function createWorkspaceProject(
    app: INestApplication,
    workspaceId: string,
    ownerUserId: string,
    overrides?: Partial<{ name: string; slug: string; description: string }>
): Promise<Project> {
    const prisma = getPrismaClient(app);
    const suffix = randomUUID().replaceAll('-', '').slice(0, 16);

    return prisma.project.create({
        data: {
            workspaceId,
            name: overrides?.name ?? `E2E Project ${suffix}`,
            slug: overrides?.slug ?? `e2e-project-${suffix}`,
            description: overrides?.description ?? 'E2E fixture project',
            createdBy: ownerUserId,
        },
    });
}

/**
 * Adds a real `ProjectMember` row directly through the app's Prisma client.
 * `createWorkspaceProject` does not itself create a membership, so a spec whose route requires
 * the caller to hold a `ProjectMember` row (guarded by `ProjectMemberProtected`) adds one
 * explicitly with this helper.
 */
export async function addProjectMember(
    app: INestApplication,
    projectId: string,
    userId: string,
    role: EnumProjectMemberRole = EnumProjectMemberRole.admin
): Promise<ProjectMember> {
    const prisma = getPrismaClient(app);

    return prisma.projectMember.create({
        data: {
            projectId,
            userId,
            role,
            createdBy: userId,
        },
    });
}
