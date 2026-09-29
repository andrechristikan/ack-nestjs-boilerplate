import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyPlaceholderContext } from '@modules/policy/interfaces/policy.interface';
import {
    isPlainJsonObject,
    interpolate,
    resolvePlaceholders,
    policyScopeOf,
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
    const workspacePair = {
        key: 'workspaceId',
        placeholder: '${workspace.id}',
    } as const;

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

    describe('interpolate', () => {
        it('replaces only the explicitly supplied placeholders', () => {
            expect(
                interpolate(
                    {
                        userId: '${user.id}',
                        workspaceId: '${workspace.id}',
                    },
                    { '${user.id}': 'user-1' }
                )
            ).toEqual({
                userId: 'user-1',
                workspaceId: '${workspace.id}',
            });
        });

        it('recurses through nested objects and arrays without mutating input', () => {
            const conditions = {
                AND: [
                    { userId: '${user.id}' },
                    { ids: ['${project.id}', 'literal'] },
                ],
            };

            expect(
                interpolate(conditions, {
                    '${user.id}': 'user-1',
                    '${project.id}': 'project-1',
                })
            ).toEqual({
                AND: [{ userId: 'user-1' }, { ids: ['project-1', 'literal'] }],
            });
            expect(conditions).toEqual({
                AND: [
                    { userId: '${user.id}' },
                    { ids: ['${project.id}', 'literal'] },
                ],
            });
        });

        it('drops a condition when a supplied placeholder has no value', () => {
            expect(
                interpolate(
                    { userId: '${user.id}' },
                    { '${user.id}': undefined }
                )
            ).toBeNull();
        });
    });

    describe('policyScopeOf', () => {
        it('keys a workspace-level subject on its workspaceId', () => {
            expect(
                policyScopeOf(EnumPolicySubject.WorkspaceMember, [
                    EnumPolicyAction.update,
                ])
            ).toEqual(workspacePair);
        });

        it('keys the workspace subject on its own id', () => {
            expect(
                policyScopeOf(EnumPolicySubject.Workspace, [
                    EnumPolicyAction.read,
                ])
            ).toEqual({ key: 'id', placeholder: '${workspace.id}' });
        });

        it('keys the project subject on its own id', () => {
            expect(
                policyScopeOf(EnumPolicySubject.Project, [
                    EnumPolicyAction.read,
                ])
            ).toEqual({ key: 'id', placeholder: '${project.id}' });
        });

        it('keys projectMember on its projectId only', () => {
            expect(
                policyScopeOf(EnumPolicySubject.ProjectMember, [
                    EnumPolicyAction.create,
                ])
            ).toEqual({ key: 'projectId', placeholder: '${project.id}' });
        });

        it('waives the pair for a bare project create', () => {
            expect(
                policyScopeOf(EnumPolicySubject.Project, [
                    EnumPolicyAction.create,
                ])
            ).toBeNull();
        });

        it('does not waive a project create combined with another action', () => {
            expect(
                policyScopeOf(EnumPolicySubject.Project, [
                    EnumPolicyAction.create,
                    EnumPolicyAction.read,
                ])
            ).toEqual({ key: 'id', placeholder: '${project.id}' });
        });

        it.each([EnumPolicySubject.User, EnumPolicySubject.all])(
            'returns null for the unscoped %s subject',
            subject => {
                expect(
                    policyScopeOf(subject, [EnumPolicyAction.read])
                ).toBeNull();
            }
        );

        it('keys analytic on its workspaceId, same as the other workspace-scoped subjects', () => {
            expect(
                policyScopeOf(EnumPolicySubject.analytic, [
                    EnumPolicyAction.read,
                ])
            ).toEqual(workspacePair);
        });
    });

    describe('scopedCondition', () => {
        it('merges extra conditions after the scope pair', () => {
            const result = scopedCondition(
                EnumPolicySubject.WorkspaceInvite,
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
                    EnumPolicySubject.Project,
                    [EnumPolicyAction.create],
                    { workspaceId: 'w' }
                )
            ).toEqual({ workspaceId: 'w' });
        });

        it('preserves the mandatory scope placeholder when extra conditions use the same key', () => {
            expect(
                scopedCondition(
                    EnumPolicySubject.WorkspaceInvite,
                    [EnumPolicyAction.manage],
                    { workspaceId: 'other-workspace' }
                )
            ).toEqual({ workspaceId: '${workspace.id}' });
        });

        it('returns the extra conditions for an unscoped subject', () => {
            expect(
                scopedCondition(
                    EnumPolicySubject.User,
                    [EnumPolicyAction.read],
                    { a: 1 }
                )
            ).toEqual({ a: 1 });
        });
    });
});
