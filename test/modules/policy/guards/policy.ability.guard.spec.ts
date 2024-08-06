import { createMock } from '@golevelup/ts-jest';
import {
    ExecutionContext,
    ForbiddenException,
    HttpException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { POLICY_ABILITY_META_KEY } from 'src/modules/policy/constants/policy.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { PolicyAbilityGuard } from 'src/modules/policy/guards/policy.ability.guard';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';

describe('PolicyAbilityGuard', () => {
    let guard: PolicyAbilityGuard;

    const user = {
        type: ENUM_POLICY_ROLE_TYPE.ADMIN,
        permissions: [
            {
                action: '1,2',
                subject: ENUM_POLICY_SUBJECT.API_KEY,
            },
        ],
    };

    const userForbidden = {
        type: ENUM_POLICY_ROLE_TYPE.ADMIN,
        permissions: [
            {
                action: '1,2',
                subject: ENUM_POLICY_SUBJECT.ROLE,
            },
        ],
    };

    const userSuperAdmin = {
        type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
        permissions: [],
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [PolicyAbilityGuard, PolicyAbilityFactory],
        }).compile();

        guard = moduleRef.get<PolicyAbilityGuard>(PolicyAbilityGuard);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('Should passed the guard', async () => {
            jest.spyOn(guard['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case POLICY_ABILITY_META_KEY:
                            return [
                                {
                                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                                    action: [ENUM_POLICY_ACTION.READ],
                                },
                            ];
                        default:
                            return true;
                    }
                }
            );

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        user,
                    }),
                }),
            });

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
        });

        it('Should passed the guard without predefined ability', async () => {
            jest.spyOn(guard['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case POLICY_ABILITY_META_KEY:
                            return undefined;
                        default:
                            return true;
                    }
                }
            );

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        user,
                    }),
                }),
            });

            try {
                await guard.canActivate(executionContext);
            } catch (err) {
                expect(err).toBeInstanceOf(ForbiddenException);

                const response: Record<string, any> = (
                    err as HttpException
                ).getResponse() as Record<string, any>;
                expect(response.statusCode).toBe(
                    ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_PREDEFINED_NOT_FOUND
                );
                expect(response.message).toBe(
                    'policy.error.abilityPredefinedNotFound'
                );
            }
        });

        it('Should passed the guard because of super admin', async () => {
            jest.spyOn(guard['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case POLICY_ABILITY_META_KEY:
                            return [
                                {
                                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                                    action: [ENUM_POLICY_ACTION.READ],
                                },
                            ] as IPolicyAbility[];
                        default:
                            return true;
                    }
                }
            );

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        user: userSuperAdmin,
                    }),
                }),
            });

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
        });

        it('Should throw ForbiddenException error', async () => {
            jest.spyOn(guard['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case POLICY_ABILITY_META_KEY:
                            return [
                                {
                                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                                    action: [ENUM_POLICY_ACTION.READ],
                                },
                            ] as IPolicyAbility[];
                        default:
                            return true;
                    }
                }
            );

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        user: userForbidden,
                    }),
                }),
            });

            try {
                await guard.canActivate(executionContext);
            } catch (err) {
                expect(err).toBeInstanceOf(ForbiddenException);

                const response: Record<string, any> = (
                    err as HttpException
                ).getResponse() as Record<string, any>;
                expect(response.statusCode).toBe(
                    ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN
                );
                expect(response.message).toBe('policy.error.abilityForbidden');
            }
        });
    });
});
