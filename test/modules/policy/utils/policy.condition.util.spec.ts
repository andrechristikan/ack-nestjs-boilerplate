import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import {
    interpolate,
    isPlainJsonObject,
} from '@modules/policy/utils/policy.condition.util';

describe('PolicyConditionUtil', () => {
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

    describe('interpolate', () => {
        it('replaces supplied placeholders without mutating conditions', () => {
            const conditions = {
                userId: EnumPolicyConditionPlaceholder.userId,
                workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
            };

            expect(
                interpolate(conditions, {
                    [EnumPolicyConditionPlaceholder.userId]: 'user-1',
                    [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1',
                })
            ).toEqual({ userId: 'user-1', workspaceId: 'workspace-1' });
            expect(conditions).toEqual({
                userId: EnumPolicyConditionPlaceholder.userId,
                workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
            });
        });

        it('recurses through nested objects and arrays', () => {
            expect(
                interpolate(
                    {
                        AND: [
                            {
                                userId: EnumPolicyConditionPlaceholder.userId,
                            },
                            {
                                ids: [
                                    EnumPolicyConditionPlaceholder.projectId,
                                    'literal',
                                ],
                            },
                        ],
                    },
                    {
                        [EnumPolicyConditionPlaceholder.userId]: 'user-1',
                        [EnumPolicyConditionPlaceholder.projectId]: 'project-1',
                    }
                )
            ).toEqual({
                AND: [{ userId: 'user-1' }, { ids: ['project-1', 'literal'] }],
            });
        });

        it('returns null when a known placeholder is unavailable', () => {
            expect(
                interpolate(
                    { projectId: EnumPolicyConditionPlaceholder.projectId },
                    {}
                )
            ).toBeNull();
        });

        it('leaves unknown placeholder-like strings unchanged', () => {
            expect(
                interpolate(
                    { value: '${unknown}' },
                    { [EnumPolicyConditionPlaceholder.userId]: 'user-1' }
                )
            ).toEqual({ value: '${unknown}' });
        });
    });
});
