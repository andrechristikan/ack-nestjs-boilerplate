import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import { EnumDatabaseAuditField } from '@common/database/enums/database.enum';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import type {
    IDatabaseExtension,
    IDatabaseUnavailableExtension,
} from '@common/database/interfaces/database.client.interface';
import type {
    IDatabaseData,
    IDatabaseModelContext,
    IDatabaseRestoreArgs,
    IDatabaseSoftDeletable,
    IDatabaseSoftDeleteArgs,
    IDatabaseSoftDeleteResult,
} from '@common/database/interfaces/database.extension.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class DatabaseExtensionFactory {
    private readonly modelFields: Map<Prisma.ModelName, Set<string>>;

    constructor(
        private readonly requestStoreService: RequestStoreService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        this.modelFields = new Map(
            Object.values(Prisma.ModelName).map(model => [
                model,
                new Set<string>(
                    Object.values(Prisma[`${model}ScalarFieldEnum`])
                ),
            ])
        );
    }

    private toException(error: unknown): unknown {
        const isUnavailable = this.databaseUtil.isUnavailableError(error);

        return isUnavailable ? new DatabaseUnavailableException(error) : error;
    }

    private modelHasField(
        model: Prisma.ModelName | null,
        field: EnumDatabaseAuditField
    ): boolean {
        if (!model) {
            return false;
        }

        const fields = this.modelFields.get(model);

        return fields?.has(field) ?? false;
    }

    private isWritePayload(value: unknown): value is IDatabaseData {
        return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            !(value instanceof Date)
        );
    }

    private toWritePayloads(value: unknown): IDatabaseData[] {
        if (Array.isArray(value)) {
            return value.filter(item => this.isWritePayload(item));
        }

        const isPayload = this.isWritePayload(value);

        return isPayload ? [value] : [];
    }

    private stampCreate(
        model: Prisma.ModelName | null,
        data: unknown,
        actor: string
    ): void {
        const payloads = this.toWritePayloads(data);

        for (const payload of payloads) {
            const hasCreatedByField = this.modelHasField(
                model,
                EnumDatabaseAuditField.createdBy
            );
            if (hasCreatedByField && payload.createdBy == null) {
                payload.createdBy = actor;
            }
            const hasUpdatedByField = this.modelHasField(
                model,
                EnumDatabaseAuditField.updatedBy
            );
            if (hasUpdatedByField && payload.updatedBy == null) {
                payload.updatedBy = actor;
            }
        }
    }

    private stampUpdate(
        model: Prisma.ModelName | null,
        data: unknown,
        actor: string
    ): void {
        const payloads = this.toWritePayloads(data);

        for (const payload of payloads) {
            const hasUpdatedByField = this.modelHasField(
                model,
                EnumDatabaseAuditField.updatedBy
            );
            if (hasUpdatedByField && payload.updatedBy == null) {
                payload.updatedBy = actor;
            }
        }
    }

    buildUnavailable(): IDatabaseUnavailableExtension {
        return Prisma.defineExtension({
            name: 'unavailable',
            query: {
                $allOperations: async ({ args, query }) => {
                    try {
                        return await query(args);
                    } catch (error: unknown) {
                        throw this.toException(error);
                    }
                },
            },
        });
    }

    build(): IDatabaseExtension {
        const getActor = (): string | null => {
            return this.requestStoreService.get<string>(RequestActorStoreKey);
        };
        const getNow = (): Date => this.helperDateService.now();

        return Prisma.defineExtension({
            name: 'audit-actor',
            query: {
                $allModels: {
                    create: async ({ model, args, query }) => {
                        const actor = getActor();
                        if (actor && args.data) {
                            this.stampCreate(model, args.data, actor);
                        }

                        return query(args);
                    },
                    createMany: async ({ model, args, query }) => {
                        const actor = getActor();
                        if (actor && args.data) {
                            this.stampCreate(model, args.data, actor);
                        }

                        return query(args);
                    },
                    update: async ({ model, args, query }) => {
                        const actor = getActor();
                        if (actor && args.data) {
                            this.stampUpdate(model, args.data, actor);
                        }

                        return query(args);
                    },
                    updateMany: async ({ model, args, query }) => {
                        const actor = getActor();
                        if (actor && args.data) {
                            this.stampUpdate(model, args.data, actor);
                        }

                        return query(args);
                    },
                    upsert: async ({ model, args, query }) => {
                        const actor = getActor();
                        if (actor) {
                            this.stampCreate(model, args.create, actor);
                            this.stampUpdate(model, args.update, actor);
                        }

                        return query(args);
                    },
                },
            },
            model: {
                $allModels: {
                    /** Stays a method: Prisma.getExtensionContext reads `this` as the model delegate. */
                    async softDelete<T>(
                        this: IDatabaseSoftDeletable<T> &
                            IDatabaseModelContext<T>,
                        args: IDatabaseSoftDeleteArgs<T>
                    ): Promise<IDatabaseSoftDeleteResult<T>> {
                        const actor = getActor();
                        const data: IDatabaseData = args.data ?? {};
                        const context = Prisma.getExtensionContext(this);

                        return context.update({
                            where: args.where,
                            data: {
                                ...data,
                                deletedAt: data.deletedAt ?? getNow(),
                                deletedBy: data.deletedBy ?? actor,
                                updatedBy: data.updatedBy ?? actor,
                            },
                        });
                    },
                    async restore<T>(
                        this: IDatabaseSoftDeletable<T> &
                            IDatabaseModelContext<T>,
                        args: IDatabaseRestoreArgs<T>
                    ): Promise<IDatabaseSoftDeleteResult<T>> {
                        const actor = getActor();
                        const data: IDatabaseData = args.data ?? {};
                        const context = Prisma.getExtensionContext(this);

                        return context.update({
                            where: args.where,
                            data: {
                                ...data,
                                deletedAt: null,
                                deletedBy: null,
                                updatedBy: data.updatedBy ?? actor,
                            },
                        });
                    },
                },
            },
        });
    }
}
