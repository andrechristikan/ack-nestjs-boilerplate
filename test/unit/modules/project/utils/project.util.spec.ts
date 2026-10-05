import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { ProjectUtil } from '@modules/project/utils/project.util';

describe('ProjectUtil', () => {
    let util: ProjectUtil;

    const member: WorkspaceMember = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectUtil],
        }).compile();

        util = module.get(ProjectUtil);
    });

    describe('isWorkspaceOwner', () => {
        it('returns true when the workspace member role is owner', () => {
            const result = util.isWorkspaceOwner({
                ...member,
                role: EnumWorkspaceMemberRole.owner,
            });

            expect(result).toBe(true);
        });

        it('returns false when the workspace member role is admin', () => {
            const result = util.isWorkspaceOwner({
                ...member,
                role: EnumWorkspaceMemberRole.admin,
            });

            expect(result).toBe(false);
        });

        it('returns false when the workspace member role is member', () => {
            const result = util.isWorkspaceOwner({
                ...member,
                role: EnumWorkspaceMemberRole.member,
            });

            expect(result).toBe(false);
        });
    });
});
