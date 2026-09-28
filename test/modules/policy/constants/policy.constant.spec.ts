import { EnumPolicySubject, Prisma } from '@generated/prisma-client/client';
import { PolicySubjectRegistry } from '@modules/policy/constants/policy.constant';

describe('PolicySubjectRegistry', () => {
    const subjects = Object.values(EnumPolicySubject);
    const platformSubjects = [
        EnumPolicySubject.activityLog,
        EnumPolicySubject.apiKey,
        EnumPolicySubject.device,
        EnumPolicySubject.featureFlag,
        EnumPolicySubject.passwordHistory,
        EnumPolicySubject.role,
        EnumPolicySubject.session,
        EnumPolicySubject.termPolicy,
        EnumPolicySubject.user,
    ];

    it.each(subjects)(
        'defines a model and scope entry for the %s subject, and nothing else',
        subject => {
            const definition = PolicySubjectRegistry[subject];

            expect(Object.keys(definition).sort()).toEqual(['model', 'scope']);
        }
    );

    it.each(subjects)(
        'maps %s onto a Prisma model, or no model for the all and analytic virtual subjects',
        subject => {
            const { model } = PolicySubjectRegistry[subject];
            const models: string[] = Object.values(Prisma.ModelName);

            if (
                subject === EnumPolicySubject.all ||
                subject === EnumPolicySubject.analytic
            ) {
                expect(model).toBeNull();

                return;
            }

            expect(models).toContain(model);
        }
    );

    it.each([
        [
            EnumPolicySubject.workspace,
            { key: 'id', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.workspaceMember,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.workspaceInvite,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.workspaceJoinRequest,
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.project,
            { key: 'id', placeholder: '${project.id}' },
        ],
        [
            EnumPolicySubject.projectMember,
            { key: 'projectId', placeholder: '${project.id}' },
        ],
    ])('carries the scope pair for %s', (subject, scope) => {
        const definition = PolicySubjectRegistry[subject];

        expect(definition.scope).toEqual(scope);
    });

    it.each(platformSubjects)('gives %s no scope', subject => {
        const definition = PolicySubjectRegistry[subject];

        expect(definition.scope).toBeNull();
    });

    it('gives analytic a workspace-scoped entry with no model', () => {
        const definition = PolicySubjectRegistry[EnumPolicySubject.analytic];

        expect(definition.model).toBeNull();
        expect(definition.scope).toEqual({
            key: 'workspaceId',
            placeholder: '${workspace.id}',
        });
    });

    it('asserts analytic as a scoped subject alongside the other six', () => {
        const scopedSubjects = subjects.filter(
            subject => PolicySubjectRegistry[subject].scope !== null
        );

        expect(scopedSubjects.sort()).toEqual(
            [
                EnumPolicySubject.workspace,
                EnumPolicySubject.workspaceMember,
                EnumPolicySubject.workspaceInvite,
                EnumPolicySubject.workspaceJoinRequest,
                EnumPolicySubject.project,
                EnumPolicySubject.projectMember,
                EnumPolicySubject.analytic,
            ].sort()
        );
    });

    it('gives all no model and no scope', () => {
        const definition = PolicySubjectRegistry[EnumPolicySubject.all];

        expect(definition.model).toBeNull();
        expect(definition.scope).toBeNull();
    });
});
