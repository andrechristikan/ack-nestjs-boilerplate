import { v4, validate, version } from 'uuid';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { Prisma } from '@generated/prisma-client';

describe('DatabaseUtil', () => {
    const util = new DatabaseUtil();

    const knownError = (code: string, target?: unknown) =>
        new Prisma.PrismaClientKnownRequestError('boom', {
            code,
            clientVersion: 'test',
            meta: target === undefined ? undefined : { target },
        });

    describe('ids', () => {
        it('createId returns a valid uuid v7', () => {
            const id = util.createId();

            expect(validate(id)).toBe(true);
            expect(version(id)).toBe(7);
        });

        it('checkIdIsValid accepts uuids and rejects other strings', () => {
            expect(util.checkIdIsValid(v4())).toBe(true);
            expect(util.checkIdIsValid('nope')).toBe(false);
        });
    });

    describe('isUniqueCollision', () => {
        it('is false for a non-Prisma error', () => {
            expect(util.isUniqueCollision(new Error('x'), 'email')).toBe(false);
            expect(util.isUniqueCollision('P2002', 'email')).toBe(false);
        });

        it('is false for a Prisma error with another code', () => {
            expect(
                util.isUniqueCollision(knownError('P2025', ['email']), 'email')
            ).toBe(false);
        });

        it('is true when an array target names the field, case-insensitively and by substring', () => {
            expect(
                util.isUniqueCollision(
                    knownError('P2002', ['User_Email_key']),
                    'email'
                )
            ).toBe(true);
        });

        it('is true when a string target names the field', () => {
            expect(
                util.isUniqueCollision(
                    knownError('P2002', 'users_username_key'),
                    'username'
                )
            ).toBe(true);
        });

        it('is false when the target names another field', () => {
            expect(
                util.isUniqueCollision(knownError('P2002', ['phone']), 'email')
            ).toBe(false);
        });

        it('is false when meta has no target or a non-string target', () => {
            expect(util.isUniqueCollision(knownError('P2002'), 'email')).toBe(
                false
            );
            expect(
                util.isUniqueCollision(knownError('P2002', [1]), 'email')
            ).toBe(false);
        });
    });

    describe('toPlainObject / toPlainArray', () => {
        it('toPlainObject returns Prisma.DbNull for null', () => {
            expect(util.toPlainObject(null)).toBe(Prisma.DbNull);
        });

        it('toPlainObject deep-clones', () => {
            const source = { a: { b: 1 } };
            const copy = util.toPlainObject<typeof source, typeof source>(
                source
            );

            expect(copy).toEqual(source);
            expect(copy).not.toBe(source);
            expect(copy.a).not.toBe(source.a);
        });

        it('toPlainArray deep-clones', () => {
            const source = [{ a: 1 }];
            const copy = util.toPlainArray<typeof source, { a: number }>(
                source
            );

            expect(copy).toEqual(source);
            expect(copy[0]).not.toBe(source[0]);
        });
    });

    describe('replaceMany', () => {
        it('deletes then recreates when rows exist', () => {
            const rows = [{ id: 1 }, { id: 2 }];

            expect(util.replaceMany(rows)).toEqual({
                deleteMany: {},
                createMany: { data: rows },
            });
        });

        it('is a pure delete for an empty list', () => {
            const result = util.replaceMany([]);

            expect(result).toEqual({ deleteMany: {} });
            expect('createMany' in result).toBe(false);
        });
    });
});
