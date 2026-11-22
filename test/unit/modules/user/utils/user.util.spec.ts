import type { MockProxy } from 'vitest-mock-extended';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('UserUtil', () => {
    let configService: MockProxy<ConfigService>;

    let util: UserUtil;

    const user: User = {
        id: 'user-marigold',
        name: 'Marigold Finch',
        username: 'marigoldFinch',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'marigold@example.com',
        roleId: 'role-marigold',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-marigold',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    const iUser: IUser = {
        ...user,
        role: {
            id: 'role-marigold',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
    };

    beforeEach(async () => {
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'message.availableLanguages': ['en'],
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUtil,
                { provide: ConfigService, useValue: configService },
                HelperDateService,
            ],
        }).compile();
        util = module.get(UserUtil);
    });

    describe('isInsideResendWindow', () => {
        beforeAll(() => {
            vi.useFakeTimers();
        });

        afterAll(() => {
            vi.useRealTimers();
        });

        const lastCreatedAt = new Date('2026-03-01T00:00:00.000Z');

        it('returns true one minute after the last request with a five-minute window', () => {
            vi.setSystemTime(new Date('2026-03-01T00:01:00.000Z'));

            expect(util.isInsideResendWindow(lastCreatedAt, 5)).toBe(true);
        });

        it('returns false at the exact end of the window', () => {
            vi.setSystemTime(new Date('2026-03-01T00:05:00.000Z'));

            expect(util.isInsideResendWindow(lastCreatedAt, 5)).toBe(false);
        });

        it('returns false once the window has passed', () => {
            vi.setSystemTime(new Date('2026-03-01T00:06:00.000Z'));

            expect(util.isInsideResendWindow(lastCreatedAt, 5)).toBe(false);
        });
    });

    describe('isPasswordExpired', () => {
        beforeAll(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        });

        afterAll(() => {
            vi.useRealTimers();
        });

        it('returns false when no expiry is set', () => {
            expect(util.isPasswordExpired(null)).toBe(false);
        });

        it('returns true when the expiry date has passed', () => {
            expect(
                util.isPasswordExpired(new Date('2025-12-01T00:00:00.000Z'))
            ).toBe(true);
        });

        it('returns false when the expiry date has not passed', () => {
            expect(
                util.isPasswordExpired(new Date('2026-02-01T00:00:00.000Z'))
            ).toBe(false);
        });
    });

    describe('normalizeEmail', () => {
        it('trims and lowercases the email', () => {
            expect(util.normalizeEmail('  Ada@Mail.COM ')).toBe('ada@mail.com');
        });
    });

    describe('hasBadWord', () => {
        it('returns true when the text contains a bad word', () => {
            expect(util.hasBadWord('damn')).toBe(true);
        });

        it('returns false when the text contains no bad word', () => {
            expect(util.hasBadWord('innocent')).toBe(false);
        });

        it.each([
            // cspell:disable-next-line
            'hassan',
            'cassandra',
            'classic_dave',
            'analyst01',
            'titan',
            'document_guy',
            'john@essex.ac.uk',
        ])('returns false for %s, a bad word glued inside a token', value => {
            expect(util.hasBadWord(value)).toBe(false);
        });

        it.each(['damn_user', 'damn-user', 'user.damn', 'user1damn2'])(
            'returns true for %s, a bad word between separators',
            value => {
                expect(util.hasBadWord(value)).toBe(true);
            }
        );
    });

    describe('isUnverified', () => {
        it('returns false for a verified user', () => {
            expect(util.isUnverified(iUser)).toBe(false);
        });

        it('returns true for an unverified user', () => {
            expect(util.isUnverified({ ...iUser, isVerified: false })).toBe(
                true
            );
        });
    });

    describe('mapActivityLogActorMetadata', () => {
        it('uses updatedAt as the timestamp', () => {
            expect(util.mapActivityLogActorMetadata(user)).toEqual({
                targetUserId: user.id,
                targetUsername: user.username,
                timestamp: user.updatedAt,
            });
        });
    });

    describe('mapActivityLogTargetMetadata', () => {
        it('uses updatedAt as the timestamp', () => {
            expect(
                util.mapActivityLogTargetMetadata(user, 'actor-marigold')
            ).toEqual({
                actorUserId: 'actor-marigold',
                timestamp: user.updatedAt,
            });
        });
    });

    describe('getDisplayName', () => {
        it('returns the name when it is set', () => {
            expect(
                util.getDisplayName({ name: 'Bramble', username: 'bramble' })
            ).toBe('Bramble');
        });

        it('returns the username when the name is null', () => {
            expect(
                util.getDisplayName({ name: null, username: 'bramble' })
            ).toBe('bramble');
        });
    });
});
