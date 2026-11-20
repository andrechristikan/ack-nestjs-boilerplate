import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { buildWorkspaceMember } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectUtil', () => {
    let util: ProjectUtil;

    const member: WorkspaceMember = {
        ...buildWorkspaceMember('507f1f77bcf86cd799439013'),
        role: EnumWorkspaceMemberRole.member,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectUtil],
        }).compile();

        util = module.get(ProjectUtil);
    });

    describe('hasWorkspaceBypass', () => {
        it('returns true when the workspace member role is owner', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                role: EnumWorkspaceMemberRole.owner,
            });

            expect(result).toBe(true);
        });

        it('returns true when the workspace member role is admin', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                role: EnumWorkspaceMemberRole.admin,
            });

            expect(result).toBe(true);
        });

        it('returns false when the workspace member role is member', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                role: EnumWorkspaceMemberRole.member,
            });

            expect(result).toBe(false);
        });
    });

    describe('mapMemberActor', () => {
        it('maps the workspace member to its user id and workspace bypass', () => {
            const result = util.mapMemberActor({
                ...member,
                role: EnumWorkspaceMemberRole.admin,
            });

            expect(result).toEqual({
                userId: '507f1f77bcf86cd799439013',
                hasWorkspaceBypass: true,
            });
        });

        it('maps a plain workspace member to no bypass', () => {
            const result = util.mapMemberActor(member);

            expect(result).toEqual({
                userId: '507f1f77bcf86cd799439013',
                hasWorkspaceBypass: false,
            });
        });
    });
});
