import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type {
    IPolicyPlaceholderContext,
    IPolicyScopePair,
} from '@modules/policy/interfaces/policy.interface';
import {
    isPlainJsonObject,
    resolvePlaceholders,
    scopePairOf,
    scopedCondition,
} from '@modules/policy/utils/policy.condition.util';

describe('PolicyConditionUtil', () => {
    const context: IPolicyPlaceholderContext = {
        user: { id: 'user-1' },
        workspace: { id: 'workspace-1' },
        workspaceMember: { id: 'wm-1' },
        project: { id: 'project-1' },
        projectMember: { id: 'pm-1' },
    };
    const placeholders = [
        '${user.id}',
        '${workspace.id}',
        '${workspaceMember.id}',
        '${project.id}',
        '${projectMember.id}',
    ];
    const workspacePair: IPolicyScopePair = {
        key: 'workspaceId',
        placeholder: '${workspace.id}',
    };

    describe('isPlainJsonObject', () => {
        it('accepts a plain object', () => {
            expect(isPlainJsonObject({ a: 1 })).toBe(true);
        });

        it.each([
            ['null', null],
            ['an array', [1]],
            ['a string', 'x'],
            ['a number', 3],
        ])('rejects %s', (_name, value) => {
            expect(isPlainJsonObject(value)).toBe(false);
        });
    });

    describe('resolvePlaceholders', () => {
        it.each([
            ['${user.id}', 'user-1'],
            ['${workspace.id}', 'workspace-1'],
            ['${workspaceMember.id}', 'wm-1'],
            ['${project.id}', 'project-1'],
            ['${projectMember.id}', 'pm-1'],
        ])('replaces %s with %s', (placeholder, expected) => {
            const result = resolvePlaceholders({ field: placeholder }, context);

            expect(result).toEqual({ field: expected });
        });

        it('recurses into nested objects, arrays, AND arrays and relation is objects', () => {
            const result = resolvePlaceholders(
                {
                    AND: [
                        { workspaceId: '${workspace.id}' },
                        {
                            role: {
                                is: {
                                    tags: ['${project.id}', 'plain'],
                                },
                            },
                        },
                    ],
                },
                context
            );

            expect(result).toEqual({
                AND: [
                    { workspaceId: 'workspace-1' },
                    {
                        role: {
                            is: { tags: ['project-1', 'plain'] },
                        },
                    },
                ],
            });
        });

        it('leaves non-placeholder strings, numbers, booleans and nulls untouched', () => {
            const conditions = {
                name: 'plain',
                count: 3,
                active: true,
                note: null,
                list: [1, false, null, 'x'],
            };

            const result = resolvePlaceholders(conditions, context);

            expect(result).toEqual(conditions);
        });

        it('leaves object prototype member names untouched as plain strings', () => {
            const conditions = { a: 'constructor', b: 'toString' };

            expect(resolvePlaceholders(conditions, context)).toEqual(
                conditions
            );
        });

        it('drops entries whose value is undefined', () => {
            const result = resolvePlaceholders(
                { keep: '${user.id}', gone: undefined },
                context
            );

            expect(result).toEqual({ keep: 'user-1' });
            expect(Object.keys(result ?? {})).toEqual(['keep']);
        });

        it('rewrites values only, never keys', () => {
            const result = resolvePlaceholders(
                { '${user.id}': '${user.id}' },
                context
            );

            expect(result).toEqual({ '${user.id}': 'user-1' });
        });

        it('does not mutate the input', () => {
            const conditions = {
                AND: [{ workspaceId: '${workspace.id}' }],
            };
            const snapshot = structuredClone(conditions);

            resolvePlaceholders(conditions, context);

            expect(conditions).toEqual(snapshot);
        });

        it('passes partial interpolation strings through unchanged', () => {
            const conditions = {
                a: 'prefix-${user.id}',
                b: '${user.id}-x',
                c: '${bogus.id}',
            };

            expect(resolvePlaceholders(conditions, context)).toEqual(
                conditions
            );
        });

        it.each([
            ['user', { ...context, user: null }, '${user.id}'],
            ['workspace', { ...context, workspace: null }, '${workspace.id}'],
            ['project', { ...context, project: null }, '${project.id}'],
        ])(
            'returns null for the whole rule when the %s context value is missing',
            (_name, missing, placeholder) => {
                const result = resolvePlaceholders(
                    { keep: 'x', AND: [{ id: placeholder }] },
                    missing
                );

                expect(result).toBeNull();
            }
        );

        it.each(placeholders)(
            'returns null for %s when the context carries no value for it',
            placeholder => {
                const emptyContext: IPolicyPlaceholderContext = {
                    user: null,
                    workspace: null,
                    workspaceMember: null,
                    project: null,
                    projectMember: null,
                };

                expect(
                    resolvePlaceholders({ field: placeholder }, emptyContext)
                ).toBeNull();
            }
        );

        it('returns null when an unresolved placeholder sits inside an array element', () => {
            const result = resolvePlaceholders(
                { list: ['a', '${projectMember.id}'] },
                { ...context, projectMember: null }
            );

            expect(result).toBeNull();
        });
    });

    describe('scopePairOf', () => {
        it('keys a workspace-level subject on its workspaceId', () => {
            expect(
                scopePairOf(EnumPolicySubject.workspaceMember, [
                    EnumPolicyAction.update,
                ])
            ).toEqual(workspacePair);
        });

        it('keys the workspace subject on its own id', () => {
            expect(
                scopePairOf(EnumPolicySubject.workspace, [
                    EnumPolicyAction.read,
                ])
            ).toEqual({ key: 'id', placeholder: '${workspace.id}' });
        });

        it('keys the project subject on its own id', () => {
            expect(
                scopePairOf(EnumPolicySubject.project, [EnumPolicyAction.read])
            ).toEqual({ key: 'id', placeholder: '${project.id}' });
        });

        it('keys projectMember on its projectId only', () => {
            expect(
                scopePairOf(EnumPolicySubject.projectMember, [
                    EnumPolicyAction.create,
                ])
            ).toEqual({ key: 'projectId', placeholder: '${project.id}' });
        });

        it('waives the pair for a bare project create', () => {
            expect(
                scopePairOf(EnumPolicySubject.project, [
                    EnumPolicyAction.create,
                ])
            ).toBeNull();
        });

        it('does not waive a project create combined with another action', () => {
            expect(
                scopePairOf(EnumPolicySubject.project, [
                    EnumPolicyAction.create,
                    EnumPolicyAction.read,
                ])
            ).toEqual({ key: 'id', placeholder: '${project.id}' });
        });

        it.each([EnumPolicySubject.user, EnumPolicySubject.all])(
            'returns null for the unscoped %s subject',
            subject => {
                expect(
                    scopePairOf(subject, [EnumPolicyAction.read])
                ).toBeNull();
            }
        );

        it('keys analytic on its workspaceId, same as the other workspace-scoped subjects', () => {
            expect(
                scopePairOf(EnumPolicySubject.analytic, [EnumPolicyAction.read])
            ).toEqual(workspacePair);
        });
    });

    describe('scopedCondition', () => {
        it('merges extra conditions after the scope pair', () => {
            const result = scopedCondition(
                EnumPolicySubject.workspaceInvite,
                [EnumPolicyAction.manage],
                { status: 'pending' }
            );

            expect(result).toEqual({
                workspaceId: '${workspace.id}',
                status: 'pending',
            });
            expect(Object.keys(result ?? {})).toEqual([
                'workspaceId',
                'status',
            ]);
        });

        it('returns only the extra conditions for a waived project create', () => {
            expect(
                scopedCondition(
                    EnumPolicySubject.project,
                    [EnumPolicyAction.create],
                    { workspaceId: 'w' }
                )
            ).toEqual({ workspaceId: 'w' });
        });

        it('returns the extra conditions for an unscoped subject', () => {
            expect(
                scopedCondition(
                    EnumPolicySubject.user,
                    [EnumPolicyAction.read],
                    { a: 1 }
                )
            ).toEqual({ a: 1 });
        });
    });
});
