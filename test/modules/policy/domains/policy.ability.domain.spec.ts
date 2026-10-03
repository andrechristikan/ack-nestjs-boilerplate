import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { subject } from '@casl/ability';
import type { RawRuleOf } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
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
                    buildRealAbility([
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
                    buildRealAbility([
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
            try {
                domain.requireAccessibleWhere(
                    buildRealAbility([]),
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
            }
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
            const realAbility = buildRealAbility([
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
