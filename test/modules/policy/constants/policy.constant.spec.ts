import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
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
        'defines a complete entry for the %s subject',
        subject => {
            const definition = PolicySubjectRegistry[subject];

            expect(definition.actions.length).toBeGreaterThan(0);
            expect(definition).toHaveProperty('model');
            expect(definition).toHaveProperty('scope');
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
            [
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
                EnumPolicyAction.manage,
            ],
            { key: 'id', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.workspaceMember,
            [EnumPolicyAction.update, EnumPolicyAction.delete],
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.workspaceInvite,
            [EnumPolicyAction.create, EnumPolicyAction.manage],
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.workspaceJoinRequest,
            [EnumPolicyAction.update],
            { key: 'workspaceId', placeholder: '${workspace.id}' },
        ],
        [
            EnumPolicySubject.project,
            [
                EnumPolicyAction.read,
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ],
            { key: 'id', placeholder: '${project.id}' },
        ],
        [
            EnumPolicySubject.projectMember,
            [
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ],
            { key: 'projectId', placeholder: '${project.id}' },
        ],
    ])('carries the spec catalog for %s', (subject, actions, scope) => {
        const definition = PolicySubjectRegistry[subject];

        expect([...definition.actions]).toEqual(actions);
        expect(definition.scope).toEqual(scope);
    });

    it.each(platformSubjects)(
        'gives %s the full action enum, no scope and no conditions',
        subject => {
            const definition = PolicySubjectRegistry[subject];

            expect([...definition.actions]).toEqual(
                Object.values(EnumPolicyAction)
            );
            expect(definition.scope).toBeNull();
        }
    );

    it('gives analytic a workspace-scoped, read-only entry', () => {
        const definition = PolicySubjectRegistry[EnumPolicySubject.analytic];

        expect(definition.model).toBeNull();
        expect([...definition.actions]).toEqual([EnumPolicyAction.read]);
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

    it('gives all only the manage action', () => {
        const definition = PolicySubjectRegistry[EnumPolicySubject.all];

        expect(definition.model).toBeNull();
        expect([...definition.actions]).toEqual([EnumPolicyAction.manage]);
        expect(definition.scope).toBeNull();
    });
});
