import { describe, expect, it } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { Prisma } from '@generated/prisma-client';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';

describe('UserOnboardingUtil', () => {
    const util = new UserOnboardingUtil(new DatabaseUtil());

    const collision = (target: unknown, code = 'P2002') =>
        new Prisma.PrismaClientKnownRequestError('collision', {
            code,
            clientVersion: 'test',
            meta: { target },
        });

    it('maps a username collision to UserUsernameExistException', () => {
        expect(util.mapCreateCollision(collision(['username']))).toBeInstanceOf(
            UserUsernameExistException
        );
    });

    it('maps an email collision to UserEmailExistException', () => {
        expect(util.mapCreateCollision(collision(['email']))).toBeInstanceOf(
            UserEmailExistException
        );
    });

    it('returns a collision on another field untouched', () => {
        const error = collision(['phone']);

        expect(util.mapCreateCollision(error)).toBe(error);
    });

    it('returns a non-unique Prisma error untouched', () => {
        const error = collision(['username'], 'P2025');

        expect(util.mapCreateCollision(error)).toBe(error);
    });

    it('returns an unrelated error untouched', () => {
        const error = new Error('boom');

        expect(util.mapCreateCollision(error)).toBe(error);
    });
});
