import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';

describe('UserOnboardingUtil', () => {
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    let util: UserOnboardingUtil;

    beforeEach(async () => {
        databaseUtil.isUniqueCollision.mockReturnValue(false);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserOnboardingUtil,
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        util = moduleRef.get(UserOnboardingUtil);
    });

    it('maps a username collision to UserUsernameExistException', () => {
        databaseUtil.isUniqueCollision.mockImplementation(
            (_error, field) => field === 'username'
        );

        expect(util.mapCreateCollision(new Error('collision'))).toBeInstanceOf(
            UserUsernameExistException
        );
    });

    it('maps an email collision to UserEmailExistException', () => {
        databaseUtil.isUniqueCollision.mockImplementation(
            (_error, field) => field === 'email'
        );

        expect(util.mapCreateCollision(new Error('collision'))).toBeInstanceOf(
            UserEmailExistException
        );
    });

    it('returns a collision on another field untouched', () => {
        const error = new Error('collision');

        expect(util.mapCreateCollision(error)).toBe(error);
    });

    it('returns a non-unique Prisma error untouched', () => {
        const error = new Error('collision');
        databaseUtil.isUniqueCollision.mockReturnValue(false);

        expect(util.mapCreateCollision(error)).toBe(error);
    });

    it('returns an unrelated error untouched', () => {
        const error = new Error('boom');

        expect(util.mapCreateCollision(error)).toBe(error);
    });
});
