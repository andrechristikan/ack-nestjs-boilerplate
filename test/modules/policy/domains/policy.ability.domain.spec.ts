import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import type {
    PolicyAbility,
    PolicyAbilityRule,
} from '@modules/policy/interfaces/policy.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { subject } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    type Policy,
} from '@generated/prisma-client';

describe('PolicyAbilityDomain', () => {
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    let domain: PolicyAbilityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyRepository.findManyByRoleId.mockResolvedValue([]);
        policyAbilityFactory.resolveRules.mockReturnValue([]);
        policyAbilityFactory.build.mockReturnValue(ability);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyAbilityDomain,
                { provide: PolicyRepository, useValue: policyRepository },
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        domain = moduleRef.get(PolicyAbilityDomain);
    });

    it('loads the platform role and returns one ability', async () => {
        await expect(
            domain.buildAbility({
                user: { id: 'user-1', roleId: 'platform-role' },
            })
        ).resolves.toBe(ability);

        expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
            'platform-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(1);
        expect(policyAbilityFactory.build).toHaveBeenCalledTimes(1);
    });

    it('adds workspace and project roles to the same ability', async () => {
        await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            workspace: { id: 'workspace-1', memberRoleId: 'workspace-role' },
            project: { id: 'project-1', memberRoleId: 'project-role' },
        });

        expect(policyRepository.findManyByRoleId).toHaveBeenNthCalledWith(
            1,
            'platform-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenNthCalledWith(
            2,
            'workspace-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenNthCalledWith(
            3,
            'project-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(3);
    });

    it('does not load a project role when project membership is absent', async () => {
        await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            project: { id: 'project-1', memberRoleId: null },
        });

        expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(1);
    });

    it('resolves each role with one placeholder map and builds one ability from every resolved rule', async () => {
        const platformPolicies = [mock<Policy>()];
        const workspacePolicies = [mock<Policy>()];
        const platformRule: PolicyAbilityRule = {
            subject: 'User',
            action: EnumPolicyAction.read,
        };
        const workspaceRule: PolicyAbilityRule = {
            subject: 'Project',
            action: EnumPolicyAction.read,
        };
        policyRepository.findManyByRoleId.mockImplementation(async roleId =>
            roleId === 'platform-role' ? platformPolicies : workspacePolicies
        );
        policyAbilityFactory.resolveRules.mockImplementation(policies =>
            policies === platformPolicies ? [platformRule] : [workspaceRule]
        );

        await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            workspace: { id: 'workspace-1', memberRoleId: 'workspace-role' },
            project: { id: 'project-1', memberRoleId: null },
        });

        const placeholders = {
            '${userId}': 'user-1',
            '${workspaceId}': 'workspace-1',
            '${projectId}': 'project-1',
        };
        expect(policyAbilityFactory.resolveRules).toHaveBeenNthCalledWith(
            1,
            platformPolicies,
            placeholders
        );
        expect(policyAbilityFactory.resolveRules).toHaveBeenNthCalledWith(
            2,
            workspacePolicies,
            placeholders
        );
        expect(policyAbilityFactory.build).toHaveBeenCalledExactlyOnceWith([
            platformRule,
            workspaceRule,
        ]);
    });

    it('rejects when a role load fails and builds nothing', async () => {
        const error = new Error('db down');
        policyRepository.findManyByRoleId.mockRejectedValue(error);

        await expect(
            domain.buildAbility({
                user: { id: 'user-1', roleId: 'platform-role' },
            })
        ).rejects.toBe(error);
        expect(policyAbilityFactory.build).not.toHaveBeenCalled();
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
        it('returns null when the ability has no rules for the subject', () => {
            ability.rulesFor.mockReturnValue([]);

            expect(
                domain.accessibleWhere(
                    ability,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toBeNull();
        });

        it('converts matching CASL rules into a Prisma where clause', () => {
            expect(
                domain.accessibleWhere(
                    createPrismaAbility<PolicyAbility>([
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: { workspaceId: 'workspace-1' },
                        },
                    ]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({ OR: [{ workspaceId: 'workspace-1' }] });
        });

        it('combines multiple allow rules into an OR where clause', () => {
            expect(
                domain.accessibleWhere(
                    createPrismaAbility<PolicyAbility>([
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
                    ]),
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
            expect(
                domain.accessibleWhere(
                    createPrismaAbility<PolicyAbility>([
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: {},
                        },
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            inverted: true,
                            conditions: { archived: true },
                        },
                    ]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({
                OR: [{ AND: [{}, { NOT: { archived: true } }] }],
            });
        });
    });

    describe('requireAccessibleWhere', () => {
        it('returns the Prisma where clause the ability grants for the subject', () => {
            expect(
                domain.requireAccessibleWhere(
                    createPrismaAbility<PolicyAbility>([
                        {
                            action: EnumPolicyAction.read,
                            subject: 'Project',
                            conditions: { workspaceId: 'workspace-1' },
                        },
                    ]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toEqual({ OR: [{ workspaceId: 'workspace-1' }] });
        });

        it('throws PolicyForbiddenException when the ability has no rules for the subject', () => {
            expect(() =>
                domain.requireAccessibleWhere(
                    createPrismaAbility<PolicyAbility>([]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toThrow(PolicyForbiddenException);
            expect(() =>
                domain.requireAccessibleWhere(
                    createPrismaAbility<PolicyAbility>([]),
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toThrow(
                expect.objectContaining({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.forbidden,
                    messagePath: 'policy.error.forbidden',
                })
            );
        });
    });

    describe('assertCan', () => {
        beforeEach(() => {
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
                    ability,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).not.toThrow();
        });

        it('throws PolicyForbiddenException with no reason when no rule matches', () => {
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                domain.assertCan(
                    ability,
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
                expect(
                    (error as PolicyForbiddenException).metadata
                ).toBeUndefined();
            }
        });

        it('throws PolicyForbiddenException carrying the reason of the matched inverted rule', () => {
            ability.relevantRuleFor.mockReturnValue({
                inverted: true,
                reason: 'blocked by rule',
            } as ReturnType<PolicyAbility['relevantRuleFor']>);

            try {
                domain.assertCan(
                    ability,
                    EnumPolicyAction.delete,
                    EnumPolicySubject.Project
                );
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(PolicyForbiddenException);
                expect((error as PolicyForbiddenException).metadata).toEqual({
                    reason: 'blocked by rule',
                });
            }
        });

        it('checks a subject-tagged record', () => {
            const record = { id: 'workspace-1' };
            const target = subject(EnumPolicySubject.Workspace, record);
            ability.relevantRuleFor.mockReturnValue(null);

            try {
                domain.assertCan(ability, EnumPolicyAction.update, target);
                throw new Error('expected throw');
            } catch {
                expect(ability.relevantRuleFor).toHaveBeenCalledWith(
                    EnumPolicyAction.update,
                    target,
                    undefined
                );
            }
        });

        it('rethrows errors that are not CASL forbidden errors', () => {
            const error = new Error('ability failure');
            ability.relevantRuleFor.mockImplementation(() => {
                throw error;
            });

            expect(() =>
                domain.assertCan(
                    ability,
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )
            ).toThrow(error);
            expect(ability.relevantRuleFor).toHaveBeenCalledOnce();
        });

        it('allows a matching conditional record and denies a different record', () => {
            const realAbility = createPrismaAbility<PolicyAbility>([
                {
                    action: EnumPolicyAction.update,
                    subject: 'Workspace',
                    conditions: { id: 'workspace-1' },
                },
            ]);

            expect(() =>
                domain.assertCan(
                    realAbility,
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-1' })
                )
            ).not.toThrow();
            expect(() =>
                domain.assertCan(
                    realAbility,
                    EnumPolicyAction.update,
                    subject(EnumPolicySubject.Workspace, { id: 'workspace-2' })
                )
            ).toThrow(PolicyForbiddenException);
        });
    });

    describe('getEffectivePermissions', () => {
        it('returns only the concrete actions granted for each subject', () => {
            ability.can.mockImplementation(
                (action, subjectName) =>
                    subjectName === EnumPolicySubject.User &&
                    action === EnumPolicyAction.read
            );

            expect(
                domain.getEffectivePermissions(ability, [
                    EnumPolicySubject.User,
                    EnumPolicySubject.Project,
                ])
            ).toEqual([
                {
                    subject: EnumPolicySubject.User,
                    actions: [EnumPolicyAction.read],
                },
            ]);
        });

        it('omits a subject when an inverse rule denies every action', () => {
            ability.can.mockReturnValue(false);

            expect(
                domain.getEffectivePermissions(ability, [
                    EnumPolicySubject.Workspace,
                ])
            ).toEqual([]);
            expect(ability.can).toHaveBeenCalledTimes(
                Object.values(EnumPolicyAction).length
            );
        });
    });
});

describe('PolicyAbilityDomain placeholder resolution with the real factory', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const workspaceProjectMemberPolicy = {
        id: 'policy-1',
        roleId: 'workspace-role',
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.read],
        conditions: { projectId: '${projectId}' },
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    let domain: PolicyAbilityDomain;

    beforeEach(() => {
        policyRepository.findManyByRoleId.mockImplementation(async roleId =>
            roleId === 'workspace-role' ? [workspaceProjectMemberPolicy] : []
        );
        domain = new PolicyAbilityDomain(
            policyRepository,
            new PolicyAbilityFactory(),
            mock<RequestStoreService>()
        );
    });

    it('resolves a project placeholder held by a workspace role when a project is in context', async () => {
        const ability = await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            workspace: { id: 'workspace-1', memberRoleId: 'workspace-role' },
            project: { id: 'project-1', memberRoleId: null },
        });

        expect(ability.rules).toHaveLength(1);
        expect(
            ability.can(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.ProjectMember, {
                    projectId: 'project-1',
                })
            )
        ).toBe(true);
        expect(
            ability.can(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.ProjectMember, {
                    projectId: 'project-2',
                })
            )
        ).toBe(false);
    });

    it('omits the rule when no project is in context', async () => {
        const ability = await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            workspace: { id: 'workspace-1', memberRoleId: 'workspace-role' },
        });

        expect(ability.rules).toHaveLength(0);
    });
});
