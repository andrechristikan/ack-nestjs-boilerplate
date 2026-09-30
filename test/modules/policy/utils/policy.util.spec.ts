import { createPrismaAbility } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';

describe('PolicyUtil', () => {
    const policyUtil = new PolicyUtil();

    describe('toSubject', () => {
        it('tags a record so CASL detects its policy subject', () => {
            const project = policyUtil.toSubject(EnumPolicySubject.Project, {
                id: 'project-id',
                workspaceId: 'workspace-id',
            });
            const ability = createPrismaAbility<PolicyAbility>([
                {
                    action: EnumPolicyAction.read,
                    subject: EnumPolicySubject.Project,
                    conditions: { workspaceId: 'workspace-id' },
                },
            ]);

            expect(ability.detectSubjectType(project)).toBe(
                EnumPolicySubject.Project
            );
            expect(ability.can(EnumPolicyAction.read, project)).toBe(true);
            expect(project).toMatchObject({
                id: 'project-id',
                workspaceId: 'workspace-id',
            });
        });
    });
});
