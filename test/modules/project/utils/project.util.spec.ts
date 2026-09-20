import { describe, expect, it } from 'vitest';

import {
    EnumWorkspaceMemberRole,
    type WorkspaceMember,
} from '@generated/prisma-client';
import { ProjectUtil } from '@modules/project/utils/project.util';

describe('ProjectUtil', () => {
    const util = new ProjectUtil();

    it.each([
        [EnumWorkspaceMemberRole.owner, true],
        [EnumWorkspaceMemberRole.admin, false],
        [EnumWorkspaceMemberRole.member, false],
    ])('isWorkspaceOwner for role %s is %s', (role, expected) => {
        expect(util.isWorkspaceOwner({ role } as WorkspaceMember)).toBe(
            expected
        );
    });
});
