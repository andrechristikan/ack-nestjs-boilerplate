import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import { DatabaseModelRelations } from '@common/database/constants/database.constant';
import type {
    IDatabaseData,
    IDatabaseModelContext,
    IDatabaseRestoreArgs,
    IDatabaseSoftDeleteArgs,
} from '@common/database/interfaces/database.extension.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class DatabaseExtensionUtil {
    private readonly modelFields: Map<Prisma.ModelName, Set<string>>;

    constructor(
        private readonly requestStoreService: RequestStoreService,
        private readonly helperDateService: HelperDateService
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

    /**
     * Whether the model owns the audit field, per its `Prisma.<Model>ScalarFieldEnum`. False when no
     * model is given.
     */
    private modelHasField(
        model: Prisma.ModelName | undefined,
        field: 'createdBy' | 'updatedBy'
    ): boolean {
        if (!model) {
            return false;
        }

        const fields = this.modelFields.get(model);

        return fields?.has(field) ?? false;
    }

    /**
     * Whether the value is a plain writable payload object. Arrays and Dates are excluded because
     * neither can carry audit fields.
     */
    private isWritePayload(value: unknown): value is IDatabaseData {
        return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            !(value instanceof Date)
        );
    }

    /**
     * Normalizes a write argument to a payload list, so single and createMany writes take one code
     * path.
     */
    private toWritePayloads(value: unknown): IDatabaseData[] {
        if (Array.isArray(value)) {
            return value.filter(item => this.isWritePayload(item));
        }

        const isPayload = this.isWritePayload(value);

        return isPayload ? [value] : [];
    }

    /**
     * Fills `createdBy` and `updatedBy` on every payload of a create write, then recurses into nested
     * writes. A field the caller already set is left alone.
     */
    private stampCreate(
        model: Prisma.ModelName | undefined,
        data: unknown,
        actor: string
    ): void {
        const payloads = this.toWritePayloads(data);

        for (const payload of payloads) {
            const hasCreatedByField = this.modelHasField(model, 'createdBy');
            if (hasCreatedByField && payload.createdBy == null) {
                payload.createdBy = actor;
            }
            const hasUpdatedByField = this.modelHasField(model, 'updatedBy');
            if (hasUpdatedByField && payload.updatedBy == null) {
                payload.updatedBy = actor;
            }

            this.stampRelations(model, payload, actor);
        }
    }

    /**
     * Fills `updatedBy` on every payload of an update write, then recurses into nested writes. A field
     * the caller already set is left alone.
     */
    private stampUpdate(
        model: Prisma.ModelName | undefined,
        data: unknown,
        actor: string
    ): void {
        const payloads = this.toWritePayloads(data);

        for (const payload of payloads) {
            const hasUpdatedByField = this.modelHasField(model, 'updatedBy');
            if (hasUpdatedByField && payload.updatedBy == null) {
                payload.updatedBy = actor;
            }

            this.stampRelations(model, payload, actor);
        }
    }

    /**
     * Walks the payload relation fields and stamps each nested write against the RELATED model,
     * resolved from `DatabaseModelRelations`.
     */
    private stampRelations(
        model: Prisma.ModelName | undefined,
        payload: IDatabaseData,
        actor: string
    ): void {
        if (!model) {
            return;
        }

        const relations: Readonly<Record<string, Prisma.ModelName>> =
            DatabaseModelRelations[model];

        for (const [field, relatedModel] of Object.entries(relations)) {
            const value = payload[field];
            const isPayload = this.isWritePayload(value);
            if (!isPayload) {
                continue;
            }

            this.stampNestedWrite(relatedModel, value, actor);
        }
    }

    /**
     * Stamps every write verb a relation container can hold: create, createMany, connectOrCreate,
     * upsert, update, updateMany.
     */
    private stampNestedWrite(
        model: Prisma.ModelName,
        container: IDatabaseData,
        actor: string
    ): void {
        this.stampCreate(model, container.create, actor);

        const createMany = container.createMany;
        const isCreateManyPayload = this.isWritePayload(createMany);
        if (isCreateManyPayload) {
            this.stampCreate(model, createMany.data, actor);
        }

        const connectOrCreatePayloads = this.toWritePayloads(
            container.connectOrCreate
        );

        for (const entry of connectOrCreatePayloads) {
            this.stampCreate(model, entry.create, actor);
        }

        const upsertPayloads = this.toWritePayloads(container.upsert);

        for (const entry of upsertPayloads) {
            this.stampCreate(model, entry.create, actor);
            this.stampUpdate(model, entry.update, actor);
        }

        const updatePayloads = this.toWritePayloads(container.update);

        for (const entry of updatePayloads) {
            this.stampNestedUpdateEntry(model, entry, actor);
        }

        const updateManyPayloads = this.toWritePayloads(container.updateMany);

        for (const entry of updateManyPayloads) {
            this.stampNestedUpdateEntry(model, entry, actor);
        }
    }

    /**
     * Stamps one nested update entry. A nested to-many update is `{ where, data }`; a to-one update
     * is the payload itself.
     */
    private stampNestedUpdateEntry(
        model: Prisma.ModelName,
        entry: IDatabaseData,
        actor: string
    ): void {
        const data = entry.data;
        const isDataPayload = this.isWritePayload(data);
        if (isDataPayload) {
            this.stampUpdate(model, data, actor);
            return;
        }

        this.stampUpdate(model, entry, actor);
    }

    /**
     * Builds the audit extension, closing over this instance's actor getter, clock, and stampers.
     * The return type stays inferred because annotating it erases the softDelete and restore model
     * methods; the lint exception is `ts/database-inferred-client` in `eslint.config.mjs`.
     */
    build() {
        const getActor = (): string | null =>
            this.requestStoreService.get<string>(RequestActorStoreKey);
        const getNow = (): Date => this.helperDateService.create();

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
                    // Must stay a method, not an arrow: Prisma.getExtensionContext
                    // reads `this` as the model delegate the call was made on.
                    async softDelete<T>(
                        this: T,
                        args: IDatabaseSoftDeleteArgs
                    ): Promise<unknown> {
                        const actor = getActor();
                        const data = args.data ?? {};
                        const context = Prisma.getExtensionContext(
                            this
                        ) as unknown as IDatabaseModelContext;

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
                        this: T,
                        args: IDatabaseRestoreArgs
                    ): Promise<unknown> {
                        const actor = getActor();
                        const data = args.data ?? {};
                        const context = Prisma.getExtensionContext(
                            this
                        ) as unknown as IDatabaseModelContext;

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
