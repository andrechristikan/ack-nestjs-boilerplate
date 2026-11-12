import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('TermPolicyUserAcceptUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const context: IRequestContext = {
        actorUserId: 'user-1',
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
    const user: IUser = {
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: timestamp,
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: timestamp,
        passwordAttempt: 0,
        signUpAt: timestamp,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let useCase: TermPolicyUserAcceptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUserAcceptUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyUserAcceptUseCase);
    });

    describe('execute', () => {
        it('accepts the type for the user passing the request context and returns an empty envelope', async () => {
            termPolicyAcceptanceService.userAccept.mockResolvedValue();

            const result = await useCase.execute(
                user,
                { type: EnumTermPolicyType.privacy },
                context
            );

            expect(result).toEqual({});
            expect(termPolicyAcceptanceService.userAccept).toHaveBeenCalledWith(
                'user-1',
                EnumTermPolicyType.privacy,
                context
            );
        });

        it('rethrows the domain rejection', async () => {
            const error = new Error('already accepted');
            termPolicyAcceptanceService.userAccept.mockRejectedValue(error);

            await expect(
                useCase.execute(
                    user,
                    { type: EnumTermPolicyType.privacy },
                    context
                )
            ).rejects.toBe(error);
        });
    });
});
