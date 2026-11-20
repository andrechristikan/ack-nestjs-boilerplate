import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Prisma } from '@generated/prisma-client/client';
import { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';
import type { IDatabaseData } from '@common/database/interfaces/database.extension.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { extractDatabaseExtension } from '@test/unit/helpers/test.unit.database.helper';
import { EnumDatabaseAuditField } from '@common/database/enums/database.enum';

describe('DatabaseExtensionFactory', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let factory: DatabaseExtensionFactory;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseExtensionFactory,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        factory = module.get(DatabaseExtensionFactory);
    });

    describe('build', () => {
        describe('query.$allModels.create', () => {
            it('stamps createdBy and updatedBy when an actor is present and data is given', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('created');
                const args: IDatabaseData = { data: { name: 'a' } };

                const result = await ext.query.$allModels.create({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toMatchObject({
                    createdBy: 'actor-1',
                    updatedBy: 'actor-1',
                });
                expect(requestStoreService.get).toHaveBeenCalledWith(
                    RequestActorStoreKey
                );
                expect(query).toHaveBeenCalledWith(args);
                expect(result).toBe('created');
            });

            it('skips stamping when no actor is in the request store', async () => {
                requestStoreService.get.mockReturnValue(null);
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('created');
                const args: IDatabaseData = { data: { name: 'a' } };

                await ext.query.$allModels.create({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toEqual({ name: 'a' });
            });

            it('skips stamping when args.data is absent even with an actor present', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('created');
                const args: IDatabaseData = {};

                await ext.query.$allModels.create({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(query).toHaveBeenCalledWith(args);
            });
        });

        describe('query.$allModels.createMany', () => {
            it('stamps every payload in the list when an actor is present', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue({ count: 2 });
                const args: IDatabaseData = {
                    data: [{ name: 'a' }, { name: 'b' }],
                };

                await ext.query.$allModels.createMany({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toMatchObject([
                    { createdBy: 'actor-1', updatedBy: 'actor-1' },
                    { createdBy: 'actor-1', updatedBy: 'actor-1' },
                ]);
            });

            it('skips stamping when no actor is in the request store', async () => {
                requestStoreService.get.mockReturnValue(null);
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue({ count: 1 });
                const args: IDatabaseData = { data: [{ name: 'a' }] };

                await ext.query.$allModels.createMany({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toEqual([{ name: 'a' }]);
            });

            it('skips stamping when args.data is absent', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue({ count: 0 });
                const args: IDatabaseData = {};

                await ext.query.$allModels.createMany({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(query).toHaveBeenCalledWith(args);
            });
        });

        describe('query.$allModels.update', () => {
            it('stamps updatedBy when an actor is present and data is given', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('updated');
                const args: IDatabaseData = { data: { name: 'a' } };

                await ext.query.$allModels.update({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toMatchObject({ updatedBy: 'actor-1' });
            });

            it('skips stamping when no actor is in the request store', async () => {
                requestStoreService.get.mockReturnValue(null);
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('updated');
                const args: IDatabaseData = { data: { name: 'a' } };

                await ext.query.$allModels.update({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toEqual({ name: 'a' });
            });

            it('skips stamping when args.data is absent', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('updated');
                const args: IDatabaseData = {};

                await ext.query.$allModels.update({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(query).toHaveBeenCalledWith(args);
            });
        });

        describe('query.$allModels.updateMany', () => {
            it('stamps updatedBy when an actor is present and data is given', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue({ count: 1 });
                const args: IDatabaseData = { data: { name: 'a' } };

                await ext.query.$allModels.updateMany({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toMatchObject({ updatedBy: 'actor-1' });
            });

            it('skips stamping when no actor is in the request store', async () => {
                requestStoreService.get.mockReturnValue(null);
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue({ count: 1 });
                const args: IDatabaseData = { data: { name: 'a' } };

                await ext.query.$allModels.updateMany({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.data).toEqual({ name: 'a' });
            });

            it('skips stamping when args.data is absent', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue({ count: 0 });
                const args: IDatabaseData = {};

                await ext.query.$allModels.updateMany({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(query).toHaveBeenCalledWith(args);
            });
        });

        describe('query.$allModels.upsert', () => {
            it('stamps both the create and update payloads when an actor is present', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('upserted');
                const args: IDatabaseData = {
                    create: { name: 'a' },
                    update: { name: 'b' },
                };

                await ext.query.$allModels.upsert({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.create).toMatchObject({
                    createdBy: 'actor-1',
                    updatedBy: 'actor-1',
                });
                expect(args.update).toMatchObject({ updatedBy: 'actor-1' });
            });

            it('skips stamping when no actor is in the request store', async () => {
                requestStoreService.get.mockReturnValue(null);
                const ext = extractDatabaseExtension(factory);
                const query = vi.fn().mockResolvedValue('upserted');
                const args: IDatabaseData = {
                    create: { name: 'a' },
                    update: { name: 'b' },
                };

                await ext.query.$allModels.upsert({
                    model: 'ApiKey',
                    args,
                    query,
                });

                expect(args.create).toEqual({ name: 'a' });
                expect(args.update).toEqual({ name: 'b' });
            });
        });

        describe('model.$allModels.softDelete', () => {
            it('fills deletedAt, deletedBy and updatedBy when data is absent', async () => {
                const now = new Date('2026-01-01T00:00:00.000Z');
                vi.setSystemTime(now);
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const update = vi.fn().mockResolvedValue('soft-deleted');
                const context = { update };

                await ext.model.$allModels.softDelete.call(context, {
                    where: { id: '1' },
                });

                expect(update).toHaveBeenCalledWith({
                    where: { id: '1' },
                    data: {
                        deletedAt: now,
                        deletedBy: 'actor-1',
                        updatedBy: 'actor-1',
                    },
                });
            });

            it('leaves an already-set deletedAt, deletedBy and updatedBy untouched', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const update = vi.fn().mockResolvedValue('soft-deleted');
                const context = { update };
                const explicitDeletedAt = new Date('2020-01-01T00:00:00.000Z');

                await ext.model.$allModels.softDelete.call(context, {
                    where: { id: '1' },
                    data: {
                        deletedAt: explicitDeletedAt,
                        deletedBy: 'other-actor',
                        updatedBy: 'other-actor',
                    },
                });

                expect(update).toHaveBeenCalledWith({
                    where: { id: '1' },
                    data: {
                        deletedAt: explicitDeletedAt,
                        deletedBy: 'other-actor',
                        updatedBy: 'other-actor',
                    },
                });
            });
        });

        describe('model.$allModels.restore', () => {
            it('clears deletedAt/deletedBy and fills updatedBy when data is absent', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const update = vi.fn().mockResolvedValue('restored');
                const context = { update };

                await ext.model.$allModels.restore.call(context, {
                    where: { id: '1' },
                });

                expect(update).toHaveBeenCalledWith({
                    where: { id: '1' },
                    data: {
                        deletedAt: null,
                        deletedBy: null,
                        updatedBy: 'actor-1',
                    },
                });
            });

            it('leaves an already-set updatedBy untouched, still clearing deletedAt/deletedBy', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(factory);
                const update = vi.fn().mockResolvedValue('restored');
                const context = { update };

                await ext.model.$allModels.restore.call(context, {
                    where: { id: '1' },
                    data: { updatedBy: 'other-actor' },
                });

                expect(update).toHaveBeenCalledWith({
                    where: { id: '1' },
                    data: {
                        deletedAt: null,
                        deletedBy: null,
                        updatedBy: 'other-actor',
                    },
                });
            });
        });
    });

    describe('modelHasField', () => {
        it('returns false when no model is given', () => {
            expect(
                factory['modelHasField'](null, EnumDatabaseAuditField.createdBy)
            ).toBe(false);
        });

        it('returns true when the model owns the field', () => {
            expect(
                factory['modelHasField'](
                    'ApiKey',
                    EnumDatabaseAuditField.createdBy
                )
            ).toBe(true);
            expect(
                factory['modelHasField'](
                    'ApiKey',
                    EnumDatabaseAuditField.updatedBy
                )
            ).toBe(true);
        });

        it('returns false when the model does not own the field', () => {
            expect(
                factory['modelHasField'](
                    'PasswordHistory',
                    EnumDatabaseAuditField.updatedBy
                )
            ).toBe(false);
        });

        it('returns false when the model has no entry in the field map', () => {
            expect(
                factory['modelHasField'](
                    'NotARealModel' as Prisma.ModelName,
                    EnumDatabaseAuditField.createdBy
                )
            ).toBe(false);
        });
    });

    describe('isWritePayload', () => {
        it('returns false for a non-object value', () => {
            expect(factory['isWritePayload']('a-string')).toBe(false);
            expect(factory['isWritePayload'](42)).toBe(false);
            expect(factory['isWritePayload'](undefined)).toBe(false);
        });

        it('returns false for null', () => {
            expect(factory['isWritePayload'](null)).toBe(false);
        });

        it('returns false for an array', () => {
            expect(factory['isWritePayload']([{ a: 1 }])).toBe(false);
        });

        it('returns false for a Date', () => {
            expect(
                factory['isWritePayload'](new Date('2026-01-01T00:00:00.000Z'))
            ).toBe(false);
        });

        it('returns true for a plain object', () => {
            expect(factory['isWritePayload']({ a: 1 })).toBe(true);
        });
    });

    describe('toWritePayloads', () => {
        it('filters an array down to its write-payload entries', () => {
            const result = factory['toWritePayloads']([
                { a: 1 },
                'skip-me',
                { b: 2 },
            ]);

            expect(result).toEqual([{ a: 1 }, { b: 2 }]);
        });

        it('wraps a single write payload in a one-item array', () => {
            expect(factory['toWritePayloads']({ a: 1 })).toEqual([{ a: 1 }]);
        });

        it('returns an empty array for a non-payload, non-array value', () => {
            expect(factory['toWritePayloads'](undefined)).toEqual([]);
            expect(factory['toWritePayloads']('not-a-payload')).toEqual([]);
        });
    });

    describe('stampCreate', () => {
        it('stamps createdBy and updatedBy when both are unset on a model owning both fields', () => {
            const payload: IDatabaseData = {};

            factory['stampCreate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({
                createdBy: 'actor-1',
                updatedBy: 'actor-1',
            });
        });

        it('leaves an already-set createdBy and updatedBy untouched', () => {
            const payload: IDatabaseData = {
                createdBy: 'preset-creator',
                updatedBy: 'preset-updater',
            };

            factory['stampCreate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({
                createdBy: 'preset-creator',
                updatedBy: 'preset-updater',
            });
        });

        it('stamps only createdBy on a model that does not own updatedBy', () => {
            const payload: IDatabaseData = {};

            factory['stampCreate']('PasswordHistory', payload, 'actor-1');

            expect(payload).toEqual({ createdBy: 'actor-1' });
        });

        it('stamps nothing and does not throw when no model is given', () => {
            const payload: IDatabaseData = { name: 'a' };

            factory['stampCreate'](null, payload, 'actor-1');

            expect(payload).toEqual({ name: 'a' });
        });

        it('stamps every payload of a createMany array', () => {
            const payloads: IDatabaseData[] = [{}, {}];

            factory['stampCreate']('ApiKey', payloads, 'actor-1');

            expect(payloads).toEqual([
                { createdBy: 'actor-1', updatedBy: 'actor-1' },
                { createdBy: 'actor-1', updatedBy: 'actor-1' },
            ]);
        });

        it('stamps nothing when data is not a write payload', () => {
            expect(() =>
                factory['stampCreate']('ApiKey', 'not-a-payload', 'actor-1')
            ).not.toThrow();
        });

        it('stamps the top-level payload and leaves every relation write verb untouched', () => {
            const relations = {
                policies: { create: { name: 'nested' } },
                users: {
                    createMany: { data: [{ name: 'many' }] },
                    connectOrCreate: [{ create: { name: 'coc' } }],
                    upsert: [
                        { create: { name: 'uc' }, update: { name: 'uu' } },
                    ],
                },
            };
            const payload: IDatabaseData = structuredClone(relations);

            factory['stampCreate']('Role', payload, 'actor-1');

            expect(payload).toEqual({
                ...relations,
                createdBy: 'actor-1',
                updatedBy: 'actor-1',
            });
        });
    });

    describe('stampUpdate', () => {
        it('stamps updatedBy when unset on a model owning the field', () => {
            const payload: IDatabaseData = {};

            factory['stampUpdate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({ updatedBy: 'actor-1' });
        });

        it('leaves an already-set updatedBy untouched', () => {
            const payload: IDatabaseData = { updatedBy: 'preset-updater' };

            factory['stampUpdate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({ updatedBy: 'preset-updater' });
        });

        it('stamps nothing on a model that does not own updatedBy', () => {
            const payload: IDatabaseData = {};

            factory['stampUpdate']('PasswordHistory', payload, 'actor-1');

            expect(payload).toEqual({});
        });

        it('stamps nothing and does not throw when no model is given', () => {
            const payload: IDatabaseData = { name: 'a' };

            factory['stampUpdate'](null, payload, 'actor-1');

            expect(payload).toEqual({ name: 'a' });
        });

        it('stamps the top-level updatedBy and leaves every relation write verb untouched', () => {
            const relations = {
                policies: {
                    update: [{ where: { id: '1' }, data: { name: 'u' } }],
                    updateMany: [{ where: {}, data: { name: 'um' } }],
                    upsert: [
                        { create: { name: 'uc' }, update: { name: 'uu' } },
                    ],
                },
            };
            const payload: IDatabaseData = structuredClone(relations);

            factory['stampUpdate']('Role', payload, 'actor-1');

            expect(payload).toEqual({ ...relations, updatedBy: 'actor-1' });
        });
    });
});
