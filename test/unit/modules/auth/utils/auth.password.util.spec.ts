import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';

describe('AuthPasswordUtil', () => {
    let util: AuthPasswordUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthPasswordUtil],
        }).compile();

        util = module.get(AuthPasswordUtil);
    });

    describe('createContextWords', () => {
        it('returns the application name, the email local part, the username, and the name', () => {
            expect(
                util.createContextWords(
                    'ACK Boilerplate',
                    'john.doe@example.com',
                    'johnny',
                    'John Doe'
                )
            ).toEqual(['ACK Boilerplate', 'john.doe', 'johnny', 'John Doe']);
        });

        it('skips a null username and a null name', () => {
            expect(
                util.createContextWords(
                    'ACK Boilerplate',
                    'john.doe@example.com',
                    null,
                    null
                )
            ).toEqual(['ACK Boilerplate', 'john.doe']);
        });
    });
});
