import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EnumRoleScope } from '@generated/prisma-client';
import type { Project, ProjectMember } from '@generated/prisma-client';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
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
 * Reads the id of the seeded project-scope catalog role whose key is `key`, the value a project
 * member body carries as `roleId`.
 */
export async function getProjectRoleId(
    app: INestApplication,
    key: EnumRoleProjectKey
): Promise<string> {
    const role = await getPrismaClient(app).role.findUniqueOrThrow({
        where: { scope_key: { scope: EnumRoleScope.project, key } },
        select: { id: true },
    });

    return role.id;
}

/**
 * Adds a real `ProjectMember` row directly through the app's Prisma client, bound to the seeded
 * project-scope catalog role whose key is `role`.
 * `createWorkspaceProject` does not itself create a membership, so a spec whose route requires
 * the caller to hold a `ProjectMember` row (guarded by `ProjectMemberProtected`) adds one
 * explicitly with this helper.
 */
export async function addProjectMember(
    app: INestApplication,
    projectId: string,
    userId: string,
    role: EnumRoleProjectKey = EnumRoleProjectKey.admin
): Promise<ProjectMember> {
    const prisma = getPrismaClient(app);
    const roleId = await getProjectRoleId(app, role);

    return prisma.projectMember.create({
        data: {
            projectId,
            userId,
            roleId,
            createdBy: userId,
        },
    });
}
