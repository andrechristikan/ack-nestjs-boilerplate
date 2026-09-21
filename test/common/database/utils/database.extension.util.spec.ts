import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseData } from '@common/database/interfaces/database.extension.interface';
import { DatabaseExtensionUtil } from '@common/database/utils/database.extension.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma } from '@generated/prisma-client/client';

describe('DatabaseExtensionUtil', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let util: DatabaseExtensionUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreService.get.mockReturnValue('actor-id');
        helperDateService.create.mockReturnValue(
            new Date('2026-01-01T00:00:00.000Z')
        );

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseExtensionUtil,
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        util = moduleRef.get(DatabaseExtensionUtil);
    });

    describe('build', () => {
        it('builds query hooks that stamp writes only when an actor and data exist', async () => {
            const extend = vi.fn((definition: unknown) => definition);
            const definition = util.build()({
                $extends: extend,
            } as never) as unknown as {
                name: string;
                query: {
                    $allModels: {
                        create: (input: {
                            model: Prisma.ModelName;
                            args: { data?: IDatabaseData };
                            query: (args: unknown) => Promise<unknown>;
                        }) => Promise<unknown>;
                        createMany: (input: {
                            model: Prisma.ModelName;
                            args: { data?: IDatabaseData[] };
                            query: (args: unknown) => Promise<unknown>;
                        }) => Promise<unknown>;
                        update: (input: {
                            model: Prisma.ModelName;
                            args: { data?: IDatabaseData };
                            query: (args: unknown) => Promise<unknown>;
                        }) => Promise<unknown>;
                        updateMany: (input: {
                            model: Prisma.ModelName;
                            args: { data?: IDatabaseData };
                            query: (args: unknown) => Promise<unknown>;
                        }) => Promise<unknown>;
                        upsert: (input: {
                            model: Prisma.ModelName;
                            args: {
                                create: IDatabaseData;
                                update: IDatabaseData;
                            };
                            query: (args: unknown) => Promise<unknown>;
                        }) => Promise<unknown>;
                    };
                };
            };
            const hooks = definition.query.$allModels;
            const query = vi.fn(async args => args);
            const createData: IDatabaseData = {};
            const createManyData: IDatabaseData[] = [{}, {}];
            const updateData: IDatabaseData = {};
            const updateManyData: IDatabaseData = {};
            const upsertCreate: IDatabaseData = {};
            const upsertUpdate: IDatabaseData = {};

            await hooks.create({
                model: Prisma.ModelName.User,
                args: { data: createData },
                query,
            });
            await hooks.createMany({
                model: Prisma.ModelName.User,
                args: { data: createManyData },
                query,
            });
            await hooks.update({
                model: Prisma.ModelName.User,
                args: { data: updateData },
                query,
            });
            await hooks.updateMany({
                model: Prisma.ModelName.User,
                args: { data: updateManyData },
                query,
            });
            await hooks.upsert({
                model: Prisma.ModelName.User,
                args: { create: upsertCreate, update: upsertUpdate },
                query,
            });

            expect(definition.name).toBe('audit-actor');
            expect(createData).toMatchObject({
                createdBy: 'actor-id',
                updatedBy: 'actor-id',
            });
            expect(createManyData).toEqual([
                expect.objectContaining({
                    createdBy: 'actor-id',
                    updatedBy: 'actor-id',
                }),
                expect.objectContaining({
                    createdBy: 'actor-id',
                    updatedBy: 'actor-id',
                }),
            ]);
            expect(updateData).toMatchObject({ updatedBy: 'actor-id' });
            expect(updateManyData).toMatchObject({ updatedBy: 'actor-id' });
            expect(upsertCreate).toMatchObject({
                createdBy: 'actor-id',
                updatedBy: 'actor-id',
            });
            expect(upsertUpdate).toMatchObject({ updatedBy: 'actor-id' });
            expect(query).toHaveBeenCalledTimes(5);

            requestStoreService.get.mockReturnValue(null);
            const unstamped: IDatabaseData = {};
            await hooks.create({
                model: Prisma.ModelName.User,
                args: { data: unstamped },
                query,
            });
            await hooks.createMany({
                model: Prisma.ModelName.User,
                args: {},
                query,
            });
            await hooks.update({
                model: Prisma.ModelName.User,
                args: {},
                query,
            });
            await hooks.updateMany({
                model: Prisma.ModelName.User,
                args: {},
                query,
            });
            await hooks.upsert({
                model: Prisma.ModelName.User,
                args: { create: {}, update: {} },
                query,
            });
            expect(unstamped).toEqual({});
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestActorStoreKey
            );
        });

        it('builds soft-delete and restore model methods with overrides', async () => {
            const extend = vi.fn((definition: unknown) => definition);
            const definition = util.build()({
                $extends: extend,
            } as never) as unknown as {
                model: {
                    $allModels: {
                        softDelete: (args: {
                            where: unknown;
                            data?: IDatabaseData;
                        }) => Promise<unknown>;
                        restore: (args: {
                            where: unknown;
                            data?: IDatabaseData;
                        }) => Promise<unknown>;
                    };
                };
            };
            const update = vi.fn(async args => args);
            const context = { update };
            const deletedAt = new Date('2025-01-01T00:00:00.000Z');

            await definition.model.$allModels.softDelete.call(context, {
                where: { id: 'one' },
            });
            expect(update).toHaveBeenLastCalledWith({
                where: { id: 'one' },
                data: {
                    deletedAt: new Date('2026-01-01T00:00:00.000Z'),
                    deletedBy: 'actor-id',
                    updatedBy: 'actor-id',
                },
            });

            await definition.model.$allModels.softDelete.call(context, {
                where: { id: 'two' },
                data: {
                    deletedAt,
                    deletedBy: 'deleting-user-id',
                    updatedBy: 'updater',
                    reason: 'request',
                },
            });
            expect(update).toHaveBeenLastCalledWith({
                where: { id: 'two' },
                data: {
                    deletedAt,
                    deletedBy: 'deleting-user-id',
                    updatedBy: 'updater',
                    reason: 'request',
                },
            });

            await definition.model.$allModels.restore.call(context, {
                where: { id: 'one' },
            });
            expect(update).toHaveBeenLastCalledWith({
                where: { id: 'one' },
                data: {
                    deletedAt: null,
                    deletedBy: null,
                    updatedBy: 'actor-id',
                },
            });

            await definition.model.$allModels.restore.call(context, {
                where: { id: 'two' },
                data: { updatedBy: 'updater', reason: 'request' },
            });
            expect(update).toHaveBeenLastCalledWith({
                where: { id: 'two' },
                data: {
                    deletedAt: null,
                    deletedBy: null,
                    updatedBy: 'updater',
                    reason: 'request',
                },
            });
        });
    });

    describe('modelHasField', () => {
        it('reports audit-field ownership and absent models', () => {
            expect(util['modelHasField'](undefined, 'createdBy')).toBe(false);
            expect(
                util['modelHasField'](Prisma.ModelName.User, 'createdBy')
            ).toBe(true);
            expect(
                util['modelHasField'](
                    Prisma.ModelName.NotificationDelivery,
                    'updatedBy'
                )
            ).toBe(false);
            util['modelFields'].delete(Prisma.ModelName.User);
            expect(
                util['modelHasField'](Prisma.ModelName.User, 'createdBy')
            ).toBe(false);
        });
    });

    describe('isWritePayload', () => {
        it('accepts plain objects and rejects non-payload shapes', () => {
            expect(util['isWritePayload']({})).toBe(true);
            expect(util['isWritePayload'](null)).toBe(false);
            expect(util['isWritePayload']([])).toBe(false);
            expect(util['isWritePayload'](new Date())).toBe(false);
            expect(util['isWritePayload']('value')).toBe(false);
        });
    });

    describe('toWritePayloads', () => {
        it('normalizes objects and filters array entries', () => {
            const payload = { id: 'one' };
            expect(util['toWritePayloads'](payload)).toEqual([payload]);
            expect(
                util['toWritePayloads']([payload, null, new Date(), 'value'])
            ).toEqual([payload]);
            expect(util['toWritePayloads'](null)).toEqual([]);
        });
    });

    describe('stampCreate', () => {
        it('preserves explicit audit values and stamps every nested write verb', () => {
            const data: IDatabaseData = {
                createdBy: 'creator',
                updatedBy: 'updater',
                mobileNumbers: {
                    create: {},
                    createMany: { data: [{}, {}] },
                    connectOrCreate: [{ create: {} }],
                    upsert: [{ create: {}, update: {} }],
                    update: [{ data: {} }, {}],
                    updateMany: [{ data: {} }, {}],
                },
            };

            util['stampCreate'](Prisma.ModelName.User, data, 'actor-id');

            expect(data).toMatchObject({
                createdBy: 'creator',
                updatedBy: 'updater',
                mobileNumbers: {
                    create: {
                        createdBy: 'actor-id',
                        updatedBy: 'actor-id',
                    },
                    createMany: {
                        data: [
                            {
                                createdBy: 'actor-id',
                                updatedBy: 'actor-id',
                            },
                            {
                                createdBy: 'actor-id',
                                updatedBy: 'actor-id',
                            },
                        ],
                    },
                },
            });
        });
    });

    describe('stampUpdate', () => {
        it('stamps missing values and ignores absent models and non-payload relations', () => {
            const data: IDatabaseData = {
                mobileNumbers: 'not-a-payload',
            };
            util['stampUpdate'](Prisma.ModelName.User, data, 'actor-id');
            expect(data).toEqual({
                updatedBy: 'actor-id',
                mobileNumbers: 'not-a-payload',
            });

            const absentModel: IDatabaseData = {};
            util['stampUpdate'](undefined, absentModel, 'actor-id');
            expect(absentModel).toEqual({});
        });
    });

    describe('stampNestedWrite', () => {
        it('ignores an absent createMany container', () => {
            expect(() =>
                util['stampNestedWrite'](
                    Prisma.ModelName.UserMobileNumber,
                    {},
                    'actor-id'
                )
            ).not.toThrow();
        });
    });
});
