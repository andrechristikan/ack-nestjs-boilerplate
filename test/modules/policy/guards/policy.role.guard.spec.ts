import { createMock } from '@golevelup/ts-jest';
import {
    ExecutionContext,
    ForbiddenException,
    HttpException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { POLICY_ROLE_META_KEY } from 'src/modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { PolicyRoleGuard } from 'src/modules/policy/guards/policy.role.guard';

describe('PolicyRoleGuard', () => {
    let guard: PolicyRoleGuard;

    const user = {
        type: ENUM_POLICY_ROLE_TYPE.ADMIN,
    };

    const userForbidden = {
        type: ENUM_POLICY_ROLE_TYPE.ADMIN,
    };

    const userSuperAdmin = {
        type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [PolicyRoleGuard],
        }).compile();

        guard = moduleRef.get<PolicyRoleGuard>(PolicyRoleGuard);
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
                        case POLICY_ROLE_META_KEY:
                            return [ENUM_POLICY_ROLE_TYPE.ADMIN];
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
                        case POLICY_ROLE_META_KEY:
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
                    ENUM_POLICY_STATUS_CODE_ERROR.ROLE_PREDEFINED_NOT_FOUND
                );
                expect(response.message).toBe(
                    'policy.error.rolePredefinedNotFound'
                );
            }
        });

        it('Should passed the guard because of super admin', async () => {
            jest.spyOn(guard['reflector'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case POLICY_ROLE_META_KEY:
                            return [ENUM_POLICY_ROLE_TYPE.ADMIN];
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
                        case POLICY_ROLE_META_KEY:
                            return [ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN];
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
                    ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN
                );
                expect(response.message).toBe('policy.error.roleForbidden');
            }
        });
    });
});
