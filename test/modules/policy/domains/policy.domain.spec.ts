import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumActivityLogAction,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type Policy,
} from '@generated/prisma-client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import {
    PolicyStoreKey,
    ProjectMemberPolicyStoreKey,
    WorkspaceMemberPolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('PolicyDomain', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [policy],
        },
        twoFactor: null,
    } satisfies IUser;
    const role = {
        id: 'role-id',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        name: 'Admin',
    };
    const superAdminRole = {
        id: 'super-admin-role-id',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        name: 'Super Admin',
    };
    const required = [
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read, EnumPolicyAction.update],
        },
    ];
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let service: PolicyDomain;

    beforeEach(async () => {
        policyAbilityFactory.createForUser.mockReturnValue(
            mock<ReturnType<PolicyAbilityFactory['createForUser']>>()
        );
        policyAbilityFactory.handlerPolicies.mockReturnValue(true);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = moduleRef.get(PolicyDomain);
    });

    it('rejects a request without an authenticated user', () => {
        expect(() =>
            service.validatePolicyGuard(null, [policy], required)
        ).toThrow(AuthJwtAccessTokenInvalidException);
    });

    it('rejects a super administrator whose role holds no policies', () => {
        policyAbilityFactory.handlerPolicies.mockReturnValue(false);

        expect(() =>
            service.validatePolicyGuard(
                {
                    ...user,
                    role: {
                        ...user.role,
                        key: EnumRolePlatformKey.superAdmin,
                        policies: [],
                    },
                },
                [],
                required
            )
        ).toThrow(PolicyForbiddenException);
    });

    it('allows any requirement when the stored policies grant manage on all', () => {
        const realFactory = new PolicyAbilityFactory();
        policyAbilityFactory.createForUser.mockImplementation(rows =>
            realFactory.createForUser(rows)
        );
        policyAbilityFactory.handlerPolicies.mockImplementation(
            (ability, policies) =>
                realFactory.handlerPolicies(ability, policies)
        );

        expect(
            service.validatePolicyGuard(
                user,
                [
                    {
                        ...policy,
                        subject: EnumPolicySubject.all,
                        action: [EnumPolicyAction.manage],
                    },
                ],
                required
            )
        ).toBe(true);
    });

    it.each([
        ['a regular role', EnumRolePlatformKey.user],
        ['a super administrator role', EnumRolePlatformKey.superAdmin],
    ])(
        'rejects %s on a route with no required policy metadata',
        (_name, key) => {
            expect(() =>
                service.validatePolicyGuard(
                    { ...user, role: { ...user.role, key } },
                    [policy],
                    []
                )
            ).toThrow(PolicyPredefinedNotFoundException);
        }
    );

    it('allows a user holding every required action', () => {
        expect(service.validatePolicyGuard(user, [policy], required)).toBe(
            true
        );
    });

    it('rejects when any required action is absent', () => {
        policyAbilityFactory.handlerPolicies.mockReturnValue(false);
        expect(() =>
            service.validatePolicyGuard(
                user,
                [policy],
                [
                    {
                        subject: EnumPolicySubject.user,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.delete,
                        ],
                    },
                ]
            )
        ).toThrow(PolicyForbiddenException);
    });

    it('denies a user whose stored policies lack the required action under the real factory', () => {
        const realFactory = new PolicyAbilityFactory();
        policyAbilityFactory.createForUser.mockImplementation(rows =>
            realFactory.createForUser(rows)
        );
        policyAbilityFactory.handlerPolicies.mockImplementation(
            (ability, policies) =>
                realFactory.handlerPolicies(ability, policies)
        );

        expect(() =>
            service.validatePolicyGuard(
                user,
                [{ ...policy, action: [EnumPolicyAction.read] }],
                required
            )
        ).toThrow(PolicyForbiddenException);
    });

    it('uses an empty policy set when the guard receives null policies', () => {
        service.validatePolicyGuard(user, null, required);

        expect(policyAbilityFactory.createForUser).toHaveBeenCalledWith([]);
    });

    it('rejects role-scoped reads when the role does not exist', async () => {
        roleDomain.getById.mockResolvedValue(null);

        await expect(service.findManyByRole('missing')).rejects.toBeInstanceOf(
            RoleNotFoundException
        );
    });

    it('returns policies for an existing role', async () => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.findManyByRoleId.mockResolvedValue([policy]);

        await expect(service.findManyByRole('role-id')).resolves.toEqual([
            policy,
        ]);
    });

    it('rejects duplicate policy creation', async () => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndSubject.mockResolvedValue(true);

        await expect(
            service.createByAdmin('role-id', required[0])
        ).rejects.toBeInstanceOf(PolicyExistException);
    });

    it('creates a policy and stages its activity', async () => {
        const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndSubject.mockResolvedValue(false);
        policyRepository.create.mockResolvedValue(policy);
        activityLogDomain.prepare.mockReturnValue(event);

        await expect(
            service.createByAdmin('role-id', required[0])
        ).resolves.toBe(policy);
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.adminPolicyCreate,
        });
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([event]);
    });

    it.each([
        [
            'update',
            (id: string) =>
                service.updateByAdmin('role-id', id, {
                    action: [EnumPolicyAction.read],
                }),
        ],
        ['delete', (id: string) => service.deleteByAdmin('role-id', id)],
    ])('rejects %s when the policy does not exist', async (_name, run) => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

        await expect(run('missing')).rejects.toBeInstanceOf(
            PolicyNotFoundException
        );
    });

    it('updates a policy and stages its activity', async () => {
        const data = { action: [EnumPolicyAction.read] };
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
        policyRepository.update.mockResolvedValue(policy);

        await expect(
            service.updateByAdmin('role-id', policy.id, data)
        ).resolves.toBe(policy);
        expect(policyRepository.update).toHaveBeenCalledWith(policy.id, data);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it('deletes a policy and stages its activity', async () => {
        roleDomain.getById.mockResolvedValue(role);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
        policyRepository.delete.mockResolvedValue(policy);

        await expect(service.deleteByAdmin('role-id', policy.id)).resolves.toBe(
            policy
        );
        expect(policyRepository.delete).toHaveBeenCalledWith(policy.id);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    describe('super administrator policy immutability', () => {
        it.each([
            [
                'create',
                () => service.createByAdmin(superAdminRole.id, required[0]),
            ],
            [
                'update',
                () =>
                    service.updateByAdmin(superAdminRole.id, policy.id, {
                        action: [EnumPolicyAction.read],
                    }),
            ],
            [
                'delete',
                () => service.deleteByAdmin(superAdminRole.id, policy.id),
            ],
        ])(
            'rejects %s before any repository read or write and before any activity log stage',
            async (_name, run) => {
                roleDomain.getById.mockResolvedValue(superAdminRole);

                await expect(run()).rejects.toBeInstanceOf(
                    PolicyImmutableException
                );
                expect(
                    policyRepository.existsByRoleIdAndSubject
                ).not.toHaveBeenCalled();
                expect(
                    policyRepository.existsByRoleIdAndId
                ).not.toHaveBeenCalled();
                expect(policyRepository.create).not.toHaveBeenCalled();
                expect(policyRepository.update).not.toHaveBeenCalled();
                expect(policyRepository.delete).not.toHaveBeenCalled();
                expect(activityLogDomain.prepare).not.toHaveBeenCalled();
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            }
        );

        it.each([
            ['a workspace role sharing the key', EnumRoleScope.workspace],
            ['a project role sharing the key', EnumRoleScope.project],
        ])('does not reject %s', async (_name, scope) => {
            roleDomain.getById.mockResolvedValue({
                ...superAdminRole,
                scope,
            });
            policyRepository.existsByRoleIdAndSubject.mockResolvedValue(false);
            policyRepository.create.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', required[0])
            ).resolves.toBe(policy);
        });

        it('lets a non super administrator platform role through', async () => {
            roleDomain.getById.mockResolvedValue(role);
            policyRepository.existsByRoleIdAndSubject.mockResolvedValue(false);
            policyRepository.create.mockResolvedValue(policy);

            await expect(
                service.createByAdmin('role-id', required[0])
            ).resolves.toBe(policy);
        });

        it.each([
            ['create', () => service.createByAdmin('missing', required[0])],
            [
                'update',
                () =>
                    service.updateByAdmin('missing', policy.id, {
                        action: [EnumPolicyAction.read],
                    }),
            ],
            ['delete', () => service.deleteByAdmin('missing', policy.id)],
        ])('rejects %s on a missing role', async (_name, run) => {
            roleDomain.getById.mockResolvedValue(null);

            await expect(run()).rejects.toBeInstanceOf(RoleNotFoundException);
        });
    });
    describe('getEffectivePolicies', () => {
        const platformPolicy = { ...policy, id: 'platform-policy-id' };
        const workspacePolicy = { ...policy, id: 'workspace-policy-id' };
        const projectPolicy = { ...policy, id: 'project-policy-id' };
        const storeKeys = (
            store: Record<string, Policy[] | undefined>
        ): void => {
            requestStoreService.get.mockImplementation(
                (key: unknown) => store[key as string] as never
            );
        };

        it('returns the platform policies when no member guard ran', () => {
            storeKeys({ [PolicyStoreKey]: [platformPolicy] });

            expect(service.getEffectivePolicies()).toEqual([platformPolicy]);
        });

        it('replaces the platform policies with the workspace role policies', () => {
            storeKeys({
                [PolicyStoreKey]: [platformPolicy],
                [WorkspaceMemberPolicyStoreKey]: [workspacePolicy],
            });

            expect(service.getEffectivePolicies()).toEqual([workspacePolicy]);
        });

        it('appends the project role policies to the workspace role policies', () => {
            storeKeys({
                [PolicyStoreKey]: [platformPolicy],
                [WorkspaceMemberPolicyStoreKey]: [workspacePolicy],
                [ProjectMemberPolicyStoreKey]: [projectPolicy],
            });

            expect(service.getEffectivePolicies()).toEqual([
                workspacePolicy,
                projectPolicy,
            ]);
        });

        it('keeps an empty workspace role list instead of falling back to the platform policies', () => {
            storeKeys({
                [PolicyStoreKey]: [platformPolicy],
                [WorkspaceMemberPolicyStoreKey]: [],
            });

            expect(service.getEffectivePolicies()).toEqual([]);
        });

        it('returns null when no guard stored any policies', () => {
            storeKeys({});

            expect(service.getEffectivePolicies()).toBeNull();
        });

        it('returns the project policies alone when only the project guard stored any', () => {
            storeKeys({ [ProjectMemberPolicyStoreKey]: [projectPolicy] });

            expect(service.getEffectivePolicies()).toEqual([projectPolicy]);
        });
    });

    describe('can', () => {
        const storePolicies = (
            rows: Pick<Policy, 'subject' | 'action'>[] | null
        ): void => {
            const stored = rows?.map(row => ({ ...policy, ...row })) ?? null;
            requestStoreService.get
                .calledWith(PolicyStoreKey)
                .mockReturnValue(stored);
        };

        beforeEach(() => {
            const realFactory = new PolicyAbilityFactory();
            policyAbilityFactory.createForUser.mockImplementation(rows =>
                realFactory.createForUser(rows)
            );
        });

        it('grants a read when the stored policies carry manage on that subject', () => {
            storePolicies([
                {
                    subject: EnumPolicySubject.project,
                    action: [EnumPolicyAction.manage],
                },
            ]);

            expect(
                service.can(EnumPolicyAction.read, EnumPolicySubject.project)
            ).toBe(true);
        });

        it('denies a read when the stored policies carry only other actions on that subject', () => {
            storePolicies([
                {
                    subject: EnumPolicySubject.project,
                    action: [EnumPolicyAction.create, EnumPolicyAction.delete],
                },
            ]);

            expect(
                service.can(EnumPolicyAction.read, EnumPolicySubject.project)
            ).toBe(false);
        });

        it('denies manage when the stored policies list its actions without manage', () => {
            storePolicies([
                {
                    subject: EnumPolicySubject.projectMember,
                    action: [
                        EnumPolicyAction.create,
                        EnumPolicyAction.update,
                        EnumPolicyAction.delete,
                    ],
                },
            ]);

            expect(
                service.can(
                    EnumPolicyAction.manage,
                    EnumPolicySubject.projectMember
                )
            ).toBe(false);
        });

        it('grants any subject when the stored policies carry manage on all', () => {
            storePolicies([
                {
                    subject: EnumPolicySubject.all,
                    action: [EnumPolicyAction.manage],
                },
            ]);

            expect(
                service.can(
                    EnumPolicyAction.delete,
                    EnumPolicySubject.workspace
                )
            ).toBe(true);
        });

        it('grants a check that only the project role policies carry', () => {
            requestStoreService.get.mockImplementation((key: unknown) => {
                if (key === WorkspaceMemberPolicyStoreKey) return [] as never;
                if (key === ProjectMemberPolicyStoreKey) {
                    return [
                        {
                            ...policy,
                            subject: EnumPolicySubject.project,
                            action: [EnumPolicyAction.manage],
                        },
                    ] as never;
                }
                return undefined as never;
            });

            expect(
                service.can(EnumPolicyAction.read, EnumPolicySubject.project)
            ).toBe(true);
        });

        it('denies every check when the store holds no policies', () => {
            storePolicies(null);

            expect(
                service.can(EnumPolicyAction.read, EnumPolicySubject.project)
            ).toBe(false);
        });

        it('denies every check when the stored policy list is empty', () => {
            storePolicies([]);

            expect(
                service.can(EnumPolicyAction.manage, EnumPolicySubject.all)
            ).toBe(false);
        });
    });
});
