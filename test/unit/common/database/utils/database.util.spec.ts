import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Prisma } from '@generated/prisma-client/client';
import { ObjectId } from 'bson';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';

describe('DatabaseUtil', () => {
    let util: DatabaseUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [DatabaseUtil],
        }).compile();

        util = module.get(DatabaseUtil);
    });

    describe('checkIdIsValid', () => {
        it('returns true for a valid ObjectId string', () => {
            const id = new ObjectId().toHexString();

            expect(util.checkIdIsValid(id)).toBe(true);
        });

        it('returns false for an invalid ObjectId string', () => {
            expect(util.checkIdIsValid('not-an-object-id')).toBe(false);
        });
    });

    describe('createId', () => {
        it('returns a fresh, valid ObjectId hex string every call', () => {
            const first = util.createId();
            const second = util.createId();

            expect(ObjectId.isValid(first)).toBe(true);
            expect(ObjectId.isValid(second)).toBe(true);
            expect(first).not.toBe(second);
        });
    });

    describe('isUniqueCollision', () => {
        it('returns false when the error is not a Prisma known-request error', () => {
            const result = util.isUniqueCollision(new Error('boom'), 'email');

            expect(result).toBe(false);
        });

        it('returns false when the error code is not P2002', () => {
            const error = new Prisma.PrismaClientKnownRequestError('boom', {
                code: 'P2025',
                clientVersion: '6.19.0',
                meta: { target: ['email'] },
            });

            expect(util.isUniqueCollision(error, 'email')).toBe(false);
        });

        it('returns true when a P2002 array target names the field, case-insensitively', () => {
            const error = new Prisma.PrismaClientKnownRequestError('boom', {
                code: 'P2002',
                clientVersion: '6.19.0',
                meta: { target: ['User_Email_key'] },
            });

            expect(util.isUniqueCollision(error, 'email')).toBe(true);
        });

        it('returns true when a P2002 string target names the field', () => {
            const error = new Prisma.PrismaClientKnownRequestError('boom', {
                code: 'P2002',
                clientVersion: '6.19.0',
                meta: { target: 'email' },
            });

            expect(util.isUniqueCollision(error, 'email')).toBe(true);
        });

        it('returns false when the P2002 target names a different field', () => {
            const error = new Prisma.PrismaClientKnownRequestError('boom', {
                code: 'P2002',
                clientVersion: '6.19.0',
                meta: { target: ['username'] },
            });

            expect(util.isUniqueCollision(error, 'email')).toBe(false);
        });

        it('returns false when the P2002 error carries no meta target', () => {
            const error = new Prisma.PrismaClientKnownRequestError('boom', {
                code: 'P2002',
                clientVersion: '6.19.0',
            });

            expect(util.isUniqueCollision(error, 'email')).toBe(false);
        });
    });

    describe('toException', () => {
        it('maps a P2034 write conflict to DatabaseWriteConflictException', () => {
            const error = new Prisma.PrismaClientKnownRequestError('conflict', {
                code: 'P2034',
                clientVersion: '6.19.0',
            });

            expect(util.toException(error)).toBeInstanceOf(
                DatabaseWriteConflictException
            );
        });

        it.each(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])(
            'maps the %s connection code to DatabaseUnavailableException',
            code => {
                const error = new Prisma.PrismaClientKnownRequestError('down', {
                    code,
                    clientVersion: '6.19.0',
                });

                expect(util.toException(error)).toBeInstanceOf(
                    DatabaseUnavailableException
                );
            }
        );

        it('maps a PrismaClientInitializationError to DatabaseUnavailableException', () => {
            const error = new Prisma.PrismaClientInitializationError(
                'cannot reach database',
                '6.19.0'
            );

            expect(util.toException(error)).toBeInstanceOf(
                DatabaseUnavailableException
            );
        });

        it('returns null for a known request error with an unrelated code', () => {
            const error = new Prisma.PrismaClientKnownRequestError('missing', {
                code: 'P2025',
                clientVersion: '6.19.0',
            });

            expect(util.toException(error)).toBeNull();
        });

        it('returns null for an unrelated error', () => {
            expect(util.toException(new Error('boom'))).toBeNull();
        });

        it('returns null for a value that is not an Error', () => {
            expect(util.toException('boom')).toBeNull();
        });
    });

    describe('toPlainObject', () => {
        it('deep-clones the object into a distinct, structurally equal instance', () => {
            const data = { a: 1, nested: { b: 2 } };

            const result = util.toPlainObject(data);

            expect(result).toEqual(data);
            expect(result).not.toBe(data);
        });
    });

    describe('toPlainArray', () => {
        it('deep-clones the array into a distinct, structurally equal instance', () => {
            const data = [{ a: 1 }, { b: 2 }];

            const result = util.toPlainArray(data);

            expect(result).toEqual(data);
            expect(result).not.toBe(data);
        });
    });
});
