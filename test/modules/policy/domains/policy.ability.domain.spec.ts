import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { subject } from '@casl/ability';
import type { RawRuleOf } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma/runtime';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';

describe('PolicyAbilityDomain', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const buildRealAbility = (
        rules: RawRuleOf<PolicyAbility>[]
    ): PolicyAbility => createPrismaAbility<PolicyAbility>(rules);
    let domain: PolicyAbilityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyAbilityDomain,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        domain = moduleRef.get(PolicyAbilityDomain);
    });

    describe('requireStored', () => {
        it('returns the value stored under the key', () => {
            requestStoreService.get.mockReturnValue(ability);

            expect(domain.requireStored<PolicyAbility>('SomeKey')).toBe(
                ability
            );
            expect(requestStoreService.get).toHaveBeenCalledWith('SomeKey');
        });

        it('throws RequestContextMissingException naming the key when nothing is stored', () => {
            requestStoreService.get.mockReturnValue(null);

            expect(() => domain.requireStored('SomeKey')).toThrow(
                RequestContextMissingException
            );
            expect(() => domain.requireStored('SomeKey')).toThrow(
                expect.objectContaining({
                    rawError: expect.objectContaining({
                        message: expect.stringContaining('SomeKey'),
                    }),
                })
            );
        });
    });

    describe('accessibleWhere', () => {
        const useAbility = (stored: PolicyAbility): void => {
            requestStoreService.get.mockReturnValue(stored);
        };

        it('reads the ability stored under PolicyAbilityStoreKey', () => {
            useAbility(
                buildRealAbility([
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        conditions: { workspaceId: 'workspace-1' },
                    },
                ])
            );

            domain.accessibleWhere(
                EnumPolicyAction.read,
                EnumPolicySubject.Project
            );

            expect(requestStoreService.get).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
        });

        it('throws RequestContextMissingException when no ability is stored', () => {
            requestStoreService.get.mockReturnValue(null);

            expect(() =>
                domain.accessibleWhere(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toThrow(RequestContextMissingException);
        });

        it('converts matching CASL rules into a Prisma where clause', () => {
            useAbility(
                buildRealAbility([
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        conditions: { workspaceId: 'workspace-1' },
                    },
                ])
            );

            expect(
                domain.accessibleWhere(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({ OR: [{ workspaceId: 'workspace-1' }] });
        });

        it('combines multiple allow rules into an OR where clause', () => {
            useAbility(
                buildRealAbility([
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        conditions: { workspaceId: 'workspace-1' },
                    },
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        conditions: { workspaceId: 'workspace-2' },
                    },
                ])
            );

            expect(
                domain.accessibleWhere(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({
                OR: [
                    { workspaceId: 'workspace-2' },
                    { workspaceId: 'workspace-1' },
                ],
            });
        });

        it('translates an inverted condition into a denying Prisma clause', () => {
            useAbility(
                buildRealAbility([
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        conditions: {},
                    },
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        inverted: true,
                        conditions: { name: 'Locked' },
                    },
                ])
            );

            expect(
                domain.accessibleWhere(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({
                OR: [{ AND: [{}, { NOT: { name: 'Locked' } }] }],
            });
        });

        it('throws PolicyForbiddenException when the ability has no rules for the subject', () => {
            useAbility(buildRealAbility([]));

            try {
                domain.accessibleWhere(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                );
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                expect(error).toMatchObject({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.forbidden,
                    messagePath: 'policy.error.forbidden',
                });
                expect((error as PolicyForbiddenException).metadata).toEqual({
                    missing: [
                        {
                            subject: EnumPolicySubject.Project,
                            actions: [EnumPolicyAction.read],
                        },
                    ],
                });
            }
        });
    });

    describe('assertCan', () => {
        beforeEach(() => {
            requestStoreService.get.mockReturnValue(ability);
            ability.detectSubjectType.mockReturnValue(
                'Project' as ReturnType<PolicyAbility['detectSubjectType']>
            );
        });

        it('passes when a non-inverted rule matches the action and subject', () => {
            ability.relevantRuleFor.mockReturnValue({
                inverted: false,
                reason: undefined,
            } as ReturnType<PolicyAbility['relevantRuleFor']>);

            expect(() =>
                domain.assertCan(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).not.toThrow();
        });

        it('throws PolicyForbiddenException with no reason when no rule matches', () => {
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                domain.assertCan(
                    EnumPolicyAction.delete,
                    EnumPolicySubject.Project
                );
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                expect(error).toMatchObject({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.forbidden,
                    messagePath: 'policy.error.forbidden',
                });
                expect((error as PolicyForbiddenException).metadata).toEqual({
                    missing: [
                        {
                            subject: EnumPolicySubject.Project,
                            actions: [EnumPolicyAction.delete],
                        },
                    ],
                });
            }
        });

        it('throws PolicyForbiddenException carrying the reason of the matched inverted rule', () => {
            ability.relevantRuleFor.mockReturnValue({
                inverted: true,
                reason: 'blocked by rule',
            } as ReturnType<PolicyAbility['relevantRuleFor']>);

            try {
                domain.assertCan(
                    EnumPolicyAction.delete,
                    EnumPolicySubject.Project
                );
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                expect((error as PolicyForbiddenException).metadata).toEqual({
                    reason: 'blocked by rule',
                    missing: [
                        {
                            subject: EnumPolicySubject.Project,
                            actions: [EnumPolicyAction.delete],
                        },
                    ],
                });
            }
        });

        it('checks a subject-tagged record', () => {
            const record = { id: 'workspace-1' };
            const target = subject(EnumPolicySubject.Workspace, record);
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                domain.assertCan(EnumPolicyAction.update, target);
                throw new Error('expected throw');
            } catch (error) {
                expect(ability.relevantRuleFor).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    target,
                    undefined
                );
                expect((error as PolicyForbiddenException).metadata).toEqual({
                    missing: [
                        {
                            subject: EnumPolicySubject.Workspace,
                            actions: [EnumPolicyAction.update],
                        },
                    ],
                });
            }
        });

        it('rethrows errors that are not CASL forbidden errors', () => {
            const error = new Error('ability failure');
            ability.relevantRuleFor.mockImplementation(() => {
                throw error;
            });

            expect(() =>
                domain.assertCan(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toThrow(error);
            expect(ability.relevantRuleFor).toHaveBeenCalledOnce();
        });

        it('allows a matching conditional record and denies a different record', () => {
            const realAbility = buildRealAbility([
                {
                    action: EnumPolicyAction.update,
                    subject: 'Workspace',
                    conditions: { id: 'workspace-1' },
                },
            ]);

            requestStoreService.get.mockReturnValue(realAbility);

            expect(() =>
                domain.assertCan(
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-1' })
                )
            ).not.toThrow();
            expect(() =>
                domain.assertCan(
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-2' })
                )
            ).toThrow(PolicyForbiddenException);
        });
    });

    describe('assertCanEvery', () => {
        const useAbility = (stored: PolicyAbility): void => {
            requestStoreService.get.mockReturnValue(stored);
        };
        const catchForbidden = (run: () => void): PolicyForbiddenException => {
            try {
                run();
            } catch (error) {
                return error as PolicyForbiddenException;
            }
            throw new Error('expected throw');
        };

        it('passes when every required action is granted', () => {
            useAbility(
                buildRealAbility([
                    {
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                        subject: 'Project',
                    },
                ])
            );

            expect(() =>
                domain.assertCanEvery([
                    {
                        subject: EnumPolicySubject.Project,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    },
                ])
            ).not.toThrow();
        });

        it('reports every missing action of a subject in one exception', () => {
            useAbility(buildRealAbility([]));

            const error = catchForbidden(() =>
                domain.assertCanEvery([
                    {
                        subject: EnumPolicySubject.Project,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    },
                ])
            );

            expect(error).toBeInstanceOf(PolicyForbiddenException);
            expect(error.metadata).toEqual({
                missing: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    },
                ],
            });
        });

        it('lists only the denied actions, merges and dedupes repeated subjects', () => {
            useAbility(
                buildRealAbility([
                    { action: EnumPolicyAction.read, subject: 'Project' },
                ])
            );

            const error = catchForbidden(() =>
                domain.assertCanEvery([
                    {
                        subject: EnumPolicySubject.Project,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    },
                    {
                        subject: EnumPolicySubject.User,
                        action: [EnumPolicyAction.read],
                    },
                    {
                        subject: EnumPolicySubject.Project,
                        action: [
                            EnumPolicyAction.update,
                            EnumPolicyAction.delete,
                        ],
                    },
                ])
            );

            expect(error.metadata).toEqual({
                missing: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [
                            EnumPolicyAction.update,
                            EnumPolicyAction.delete,
                        ],
                    },
                    {
                        subject: EnumPolicySubject.User,
                        actions: [EnumPolicyAction.read],
                    },
                ],
            });
        });

        it('carries the reason of the first denying inverted rule', () => {
            useAbility(
                buildRealAbility([
                    { action: EnumPolicyAction.read, subject: 'Project' },
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        inverted: true,
                        reason: 'blocked by rule',
                    },
                ])
            );

            const error = catchForbidden(() =>
                domain.assertCanEvery([
                    {
                        subject: EnumPolicySubject.Project,
                        action: [EnumPolicyAction.read],
                    },
                ])
            );

            expect(error.metadata).toEqual({
                reason: 'blocked by rule',
                missing: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [EnumPolicyAction.read],
                    },
                ],
            });
        });
    });

    describe('getEffectivePermissions', () => {
        it('returns only actions granted on each concrete record', () => {
            requestStoreService.get.mockReturnValue(
                buildRealAbility([
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Project',
                        conditions: { id: 'project-1' },
                    },
                    {
                        action: EnumPolicyAction.update,
                        subject: 'ProjectMember',
                        conditions: { projectId: 'project-1' },
                    },
                ])
            );

            expect(
                domain.getEffectivePermissions([
                    subject(EnumPolicySubject.Project, { id: 'project-1' }),
                    subject(EnumPolicySubject.ProjectMember, {
                        projectId: 'project-2',
                    }),
                ])
            ).toEqual([
                {
                    subject: EnumPolicySubject.Project,
                    actions: [EnumPolicyAction.read],
                },
            ]);
        });

        it('omits a subject when an inverse rule denies every action', () => {
            requestStoreService.get.mockReturnValue(
                buildRealAbility([
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Workspace',
                        conditions: { id: 'workspace-1' },
                    },
                    {
                        action: EnumPolicyAction.read,
                        subject: 'Workspace',
                        conditions: { id: 'workspace-1' },
                        inverted: true,
                    },
                ])
            );

            expect(
                domain.getEffectivePermissions([
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-1' }),
                ])
            ).toEqual([]);
        });
    });
});
