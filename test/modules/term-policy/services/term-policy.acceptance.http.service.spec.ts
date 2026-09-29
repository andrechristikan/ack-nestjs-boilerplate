import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyAcceptanceHttpService } from '@modules/term-policy/services/term-policy.acceptance.http.service';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('TermPolicyAcceptanceHttpService', () => {
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const cursorParams = { limit: 20, orderBy: [] };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as ITermPolicyUserAcceptance[],
    };
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
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
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let service: TermPolicyAcceptanceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorParams,
            storePatch: { filters: {} },
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceHttpService,
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(TermPolicyAcceptanceHttpService);
    });

    describe('getListUserAccepted', () => {
        it('merges the pagination store patch and returns the domain page', async () => {
            const query: TermPolicyAcceptedListRequestDto = { perPage: 20 };
            termPolicyAcceptanceDomain.getListUserAccepted.mockResolvedValue(
                cursorPage
            );

            const result = await service.getListUserAccepted('user-1', query);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyAcceptanceDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(
                termPolicyAcceptanceDomain.getListUserAccepted
            ).toHaveBeenCalledWith('user-1', cursorParams);
        });
    });

    describe('userAccept', () => {
        it('accepts the given term policy type for the user and returns an empty envelope', async () => {
            termPolicyAcceptanceDomain.userAccept.mockResolvedValue(undefined);

            const result = await service.userAccept(user, {
                type: EnumTermPolicyType.privacy,
            });

            expect(result).toEqual({});
            expect(termPolicyAcceptanceDomain.userAccept).toHaveBeenCalledWith(
                user,
                EnumTermPolicyType.privacy
            );
        });
    });
});
