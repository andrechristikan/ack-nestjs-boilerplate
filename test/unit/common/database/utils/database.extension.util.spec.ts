import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Prisma } from '@generated/prisma-client/client';
import { DatabaseExtensionUtil } from '@common/database/utils/database.extension.util';
import type { IDatabaseData } from '@common/database/interfaces/database.extension.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { extractDatabaseExtension } from '@test/unit/helpers/test.unit.database.helper';

describe('DatabaseExtensionUtil', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let util: DatabaseExtensionUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseExtensionUtil,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        util = module.get(DatabaseExtensionUtil);
    });

    describe('build', () => {
        describe('query.$allModels.create', () => {
            it('stamps createdBy and updatedBy when an actor is present and data is given', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(util);
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
                expect(query).toHaveBeenCalledWith(args);
                expect(result).toBe('created');
            });

            it('skips stamping when no actor is in the request store', async () => {
                requestStoreService.get.mockReturnValue(null);
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                helperDateService.create.mockReturnValue(now);
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
                expect(helperDateService.create).not.toHaveBeenCalled();
            });
        });

        describe('model.$allModels.restore', () => {
            it('clears deletedAt/deletedBy and fills updatedBy when data is absent', async () => {
                requestStoreService.get.mockReturnValue('actor-1');
                const ext = extractDatabaseExtension(util);
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
                const ext = extractDatabaseExtension(util);
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
            expect(util['modelHasField'](null, 'createdBy')).toBe(false);
        });

        it('returns true when the model owns the field', () => {
            expect(util['modelHasField']('ApiKey', 'createdBy')).toBe(true);
            expect(util['modelHasField']('ApiKey', 'updatedBy')).toBe(true);
        });

        it('returns false when the model does not own the field', () => {
            expect(util['modelHasField']('Verification', 'updatedBy')).toBe(
                false
            );
        });

        it('returns false when the model has no entry in the field map', () => {
            expect(
                util['modelHasField'](
                    'NotARealModel' as Prisma.ModelName,
                    'createdBy'
                )
            ).toBe(false);
        });
    });

    describe('isWritePayload', () => {
        it('returns false for a non-object value', () => {
            expect(util['isWritePayload']('a-string')).toBe(false);
            expect(util['isWritePayload'](42)).toBe(false);
            expect(util['isWritePayload'](undefined)).toBe(false);
        });

        it('returns false for null', () => {
            expect(util['isWritePayload'](null)).toBe(false);
        });

        it('returns false for an array', () => {
            expect(util['isWritePayload']([{ a: 1 }])).toBe(false);
        });

        it('returns false for a Date', () => {
            expect(util['isWritePayload'](new Date())).toBe(false);
        });

        it('returns true for a plain object', () => {
            expect(util['isWritePayload']({ a: 1 })).toBe(true);
        });
    });

    describe('toWritePayloads', () => {
        it('filters an array down to its write-payload entries', () => {
            const result = util['toWritePayloads']([
                { a: 1 },
                'skip-me',
                { b: 2 },
            ]);

            expect(result).toEqual([{ a: 1 }, { b: 2 }]);
        });

        it('wraps a single write payload in a one-item array', () => {
            expect(util['toWritePayloads']({ a: 1 })).toEqual([{ a: 1 }]);
        });

        it('returns an empty array for a non-payload, non-array value', () => {
            expect(util['toWritePayloads'](undefined)).toEqual([]);
            expect(util['toWritePayloads']('not-a-payload')).toEqual([]);
        });
    });

    describe('stampCreate', () => {
        it('stamps createdBy and updatedBy when both are unset on a model owning both fields', () => {
            const payload: IDatabaseData = {};

            util['stampCreate']('ApiKey', payload, 'actor-1');

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

            util['stampCreate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({
                createdBy: 'preset-creator',
                updatedBy: 'preset-updater',
            });
        });

        it('stamps only createdBy on a model that does not own updatedBy', () => {
            const payload: IDatabaseData = {};

            util['stampCreate']('Verification', payload, 'actor-1');

            expect(payload).toEqual({ createdBy: 'actor-1' });
        });

        it('stamps nothing and does not throw when no model is given', () => {
            const payload: IDatabaseData = { name: 'a' };

            util['stampCreate'](null, payload, 'actor-1');

            expect(payload).toEqual({ name: 'a' });
        });

        it('stamps every payload of a createMany array', () => {
            const payloads: IDatabaseData[] = [{}, {}];

            util['stampCreate']('ApiKey', payloads, 'actor-1');

            expect(payloads).toEqual([
                { createdBy: 'actor-1', updatedBy: 'actor-1' },
                { createdBy: 'actor-1', updatedBy: 'actor-1' },
            ]);
        });

        it('stamps nothing when data is not a write payload', () => {
            expect(() =>
                util['stampCreate']('ApiKey', 'not-a-payload', 'actor-1')
            ).not.toThrow();
        });
    });

    describe('stampUpdate', () => {
        it('stamps updatedBy when unset on a model owning the field', () => {
            const payload: IDatabaseData = {};

            util['stampUpdate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({ updatedBy: 'actor-1' });
        });

        it('leaves an already-set updatedBy untouched', () => {
            const payload: IDatabaseData = { updatedBy: 'preset-updater' };

            util['stampUpdate']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({ updatedBy: 'preset-updater' });
        });

        it('stamps nothing on a model that does not own updatedBy', () => {
            const payload: IDatabaseData = {};

            util['stampUpdate']('Verification', payload, 'actor-1');

            expect(payload).toEqual({});
        });

        it('stamps nothing and does not throw when no model is given', () => {
            const payload: IDatabaseData = { name: 'a' };

            util['stampUpdate'](null, payload, 'actor-1');

            expect(payload).toEqual({ name: 'a' });
        });
    });

    describe('stampRelations', () => {
        it('does nothing when no model is given', () => {
            expect(() =>
                util['stampRelations'](null, { user: {} }, 'actor-1')
            ).not.toThrow();
        });

        it('does nothing when the model has no relations', () => {
            const payload: IDatabaseData = { name: 'a' };

            util['stampRelations']('ApiKey', payload, 'actor-1');

            expect(payload).toEqual({ name: 'a' });
        });

        it('recurses into a write-payload relation field and skips a non-payload one', () => {
            const payload: IDatabaseData = {
                user: { create: { name: 'nested' } },
                mobileNumber: 'not-a-payload',
            };

            util['stampRelations']('Verification', payload, 'actor-1');

            expect(payload.user).toMatchObject({
                create: { name: 'nested', createdBy: 'actor-1' },
            });
        });
    });

    describe('stampNestedWrite', () => {
        it('does nothing on an empty container', () => {
            const container: IDatabaseData = {};

            expect(() =>
                util['stampNestedWrite']('ApiKey', container, 'actor-1')
            ).not.toThrow();
        });

        it('stamps every write verb a relation container can hold', () => {
            const container: IDatabaseData = {
                create: { name: 'create' },
                createMany: { data: [{ name: 'createMany' }] },
                connectOrCreate: [{ create: { name: 'connectOrCreate' } }],
                upsert: [
                    {
                        create: { name: 'upsert-create' },
                        update: { name: 'upsert-update' },
                    },
                ],
                update: [{ where: { id: '1' }, data: { name: 'to-many' } }],
                updateMany: [
                    { where: {}, data: { name: 'update-many-entry' } },
                ],
            };

            util['stampNestedWrite']('ApiKey', container, 'actor-1');

            expect(container.create).toMatchObject({ createdBy: 'actor-1' });
            expect((container.createMany as IDatabaseData).data).toMatchObject([
                { createdBy: 'actor-1' },
            ]);
            expect(
                (container.connectOrCreate as IDatabaseData[])[0].create
            ).toMatchObject({ createdBy: 'actor-1' });
            expect(
                (container.upsert as IDatabaseData[])[0].create
            ).toMatchObject({ createdBy: 'actor-1' });
            expect(
                (container.upsert as IDatabaseData[])[0].update
            ).toMatchObject({ updatedBy: 'actor-1' });
            expect(
                (container.update as IDatabaseData[])[0].data as IDatabaseData
            ).toMatchObject({ updatedBy: 'actor-1' });
            expect(
                (container.updateMany as IDatabaseData[])[0]
                    .data as IDatabaseData
            ).toMatchObject({ updatedBy: 'actor-1' });
        });

        it('skips createMany when it is not a write payload', () => {
            const container: IDatabaseData = { createMany: 'not-a-payload' };

            expect(() =>
                util['stampNestedWrite']('ApiKey', container, 'actor-1')
            ).not.toThrow();
        });
    });

    describe('stampNestedUpdateEntry', () => {
        it('stamps entry.data when the entry is a to-many { where, data } shape', () => {
            const entry: IDatabaseData = {
                where: { id: '1' },
                data: { name: 'a' },
            };

            util['stampNestedUpdateEntry']('ApiKey', entry, 'actor-1');

            expect(entry.data).toMatchObject({ updatedBy: 'actor-1' });
            expect(entry).not.toHaveProperty('updatedBy');
        });

        it('stamps the entry itself when it is a to-one update payload', () => {
            const entry: IDatabaseData = { name: 'a' };

            util['stampNestedUpdateEntry']('ApiKey', entry, 'actor-1');

            expect(entry).toMatchObject({ updatedBy: 'actor-1' });
        });
    });
});
