import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type User,
} from '@generated/prisma-client';
import { AuthUtil } from '@modules/auth/utils/auth.util';

describe('AuthUtil', () => {
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    const now = new Date('2026-01-01T00:00:00.000Z');
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
    } satisfies User;

    let util: AuthUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthUtil,
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        util = moduleRef.get(AuthUtil);
    });

    it('creates an access payload from only token-relevant user fields', () => {
        expect(
            util.createPayloadAccessToken(
                user,
                'session-id',
                'ownership-id',
                now,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            )
        ).toEqual({
            userId: 'user-id',
            roleId: 'role-id',
            username: 'user',
            email: 'user@example.com',
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
        });
    });

    it('derives a refreshInTx payload without access-only identity fields', () => {
        const accessPayload = util.createPayloadAccessToken(
            user,
            'session-id',
            'ownership-id',
            now,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential
        );

        expect(util.createPayloadRefreshToken(accessPayload)).toEqual({
            userId: 'user-id',
            sessionId: 'session-id',
            deviceOwnershipId: 'ownership-id',
            loginAt: now,
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
        });
    });

    it('generates a 32-character session token identifier', () => {
        helperStringService.random.mockReturnValue('generated-jti');

        expect(util.generateJti()).toBe('generated-jti');
        expect(helperStringService.random).toHaveBeenCalledWith(32);
    });
});
