import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Prisma } from '@generated/prisma-client/client';
import { v7, validate } from 'uuid';
import { DatabaseIdInvalidException } from '@common/database/exceptions/database.id-invalid.exception';
import { DatabaseTransactionExpiredException } from '@common/database/exceptions/database.transaction-expired.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('DatabaseUtil', () => {
    let util: DatabaseUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'database.connectTimeoutInMs': 5000,
                    }),
                },
            ],
        }).compile();

        util = module.get(DatabaseUtil);
    });

    describe('buildClientUrl', () => {
        it('appends the connect timeout in seconds with a question mark to a url with no query', () => {
            expect(util.buildClientUrl('postgresql://h:5432/db')).toBe(
                'postgresql://h:5432/db?connect_timeout=5'
            );
        });

        it('appends the connect timeout in seconds with an ampersand to a url with a query', () => {
            expect(
                util.buildClientUrl('postgresql://h:5432/db?schema=public')
            ).toBe('postgresql://h:5432/db?schema=public&connect_timeout=5');
        });

        it('carries the configured connect timeout rounded up to whole seconds', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    DatabaseUtil,
                    {
                        provide: ConfigService,
                        useValue: buildConfigService({
                            'database.connectTimeoutInMs': 2000,
                        }),
                    },
                ],
            }).compile();

            expect(
                module
                    .get(DatabaseUtil)
                    .buildClientUrl('postgresql://h:5432/db')
            ).toBe('postgresql://h:5432/db?connect_timeout=2');
        });
    });

    describe('checkIdIsValid', () => {
        it('returns true for a valid UUID string', () => {
            const id = v7();

            expect(util.checkIdIsValid(id)).toBe(true);
        });

        it('returns false for an invalid UUID string', () => {
            expect(util.checkIdIsValid('not-a-uuid')).toBe(false);
        });
    });

    describe('censorUrl', () => {
        it('masks the password and keeps the first letter of the username', () => {
            expect(
                util.censorUrl('mongodb://admin:hunter2@localhost:27017/ack')
            ).toBe('mongodb://a***@localhost:27017/ack');
        });

        it('keeps every host of a replica-set url and drops the query', () => {
            expect(
                util.censorUrl(
                    'mongodb://admin:hunter2@h1:27017,h2:27017,h3:27017/ack?replicaSet=rs0&authSource=admin'
                )
            ).toBe('mongodb://a***@h1:27017,h2:27017,h3:27017/ack');
        });

        it('keeps a url without credentials as is, minus the query', () => {
            expect(
                util.censorUrl('mongodb://localhost:27017/ack?tls=true')
            ).toBe('mongodb://localhost:27017/ack');
        });

        it('masks the password of a url that has no path', () => {
            expect(
                util.censorUrl('mongodb://admin:hunter2@localhost:27017')
            ).toBe('mongodb://a***@localhost:27017');
        });

        it('keeps a url without credentials and without a path as is', () => {
            expect(util.censorUrl('mongodb://localhost:27017')).toBe(
                'mongodb://localhost:27017'
            );
        });

        it('drops an empty username together with the password', () => {
            expect(
                util.censorUrl('mongodb://:hunter2@localhost:27017/ack')
            ).toBe('mongodb://localhost:27017/ack');
        });

        it('handles the srv scheme', () => {
            expect(
                util.censorUrl(
                    'mongodb+srv://admin:hunter2@cluster0.example.com/ack'
                )
            ).toBe('mongodb+srv://a***@cluster0.example.com/ack');
        });

        it('returns the censored value for a string that is not a url', () => {
            expect(util.censorUrl('not a url')).toBe('***');
        });
    });

    describe('createId', () => {
        it('returns a fresh, valid UUID every call', () => {
            const first = util.createId();
            const second = util.createId();

            expect(validate(first)).toBe(true);
            expect(validate(second)).toBe(true);
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

        it('maps a P2023 inconsistent column data error to DatabaseIdInvalidException', () => {
            const error = new Prisma.PrismaClientKnownRequestError('bad id', {
                code: 'P2023',
                clientVersion: '6.19.0',
            });

            expect(util.toException(error)).toBeInstanceOf(
                DatabaseIdInvalidException
            );
        });

        it('maps a P2028 transaction API error to DatabaseTransactionExpiredException', () => {
            const error = new Prisma.PrismaClientKnownRequestError('expired', {
                code: 'P2028',
                clientVersion: '6.19.0',
            });

            expect(util.toException(error)).toBeInstanceOf(
                DatabaseTransactionExpiredException
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

        it('maps a P2010 server selection timeout to DatabaseUnavailableException', () => {
            const error = new Prisma.PrismaClientKnownRequestError(
                'Raw query failed. Code: `unknown`. Message: `Kind: Server selection timeout: No available servers.`',
                { code: 'P2010', clientVersion: '6.19.0' }
            );

            expect(util.toException(error)).toBeInstanceOf(
                DatabaseUnavailableException
            );
        });

        it('returns null for a P2010 error that is no server selection timeout', () => {
            const error = new Prisma.PrismaClientKnownRequestError(
                'Transactions are not supported by this deployment',
                { code: 'P2010', clientVersion: '6.19.0' }
            );

            expect(util.toException(error)).toBeNull();
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
