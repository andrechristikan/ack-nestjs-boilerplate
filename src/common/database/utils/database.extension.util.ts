import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';
import {
    IDatabaseModelContext,
    IDatabaseRestoreArgs,
    IDatabaseRow,
    IDatabaseSoftDeleteArgs,
} from '@common/database/interfaces/database.extension.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class DatabaseExtensionUtil {
    private readonly modelFields: Map<string, Set<string>>;
    private readonly modelRelations: Map<string, Map<string, string>>;

    constructor(
        private readonly requestStoreService: RequestStoreService,
        private readonly helperService: HelperService
    ) {
        this.modelFields = new Map(
            Prisma.dmmf.datamodel.models.map(model => [
                model.name,
                new Set(model.fields.map(field => field.name)),
            ])
        );
        this.modelRelations = new Map(
            Prisma.dmmf.datamodel.models.map(model => [
                model.name,
                new Map(
                    model.fields
                        .filter(field => field.kind === 'object')
                        .map(field => [field.name, field.type])
                ),
            ])
        );
    }

    /**
     * Builds the audit extension, closing over this instance's actor getter, clock, and stampers.
     * The return type stays inferred because annotating it erases the softDelete and restore model
     * methods; the lint exception is `ts/database-inferred-client` in `eslint.config.mjs`.
     */
    build() {
        const getActor = (): string | null =>
            this.requestStoreService.get<string>(RequestActorStoreKey);
        const getNow = (): Date => this.helperService.dateCreate();

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
                    // @note Must stay a method, not an arrow: Prisma.getExtensionContext reads `this`
                    // as the model delegate the call was made on.
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

    /**
     * Whether the model owns the field, per the Prisma DMMF. False for an unknown model.
     */
    private modelHasField(model: string | undefined, field: string): boolean {
        if (!model) {
            return false;
        }

        return this.modelFields.get(model)?.has(field) ?? false;
    }

    /**
     * Whether the value is a plain writable payload object. Arrays and Dates are excluded because
     * neither can carry audit fields.
     */
    private isDatabaseRow(value: unknown): value is IDatabaseRow {
        return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            !(value instanceof Date)
        );
    }

    /**
     * Normalizes a write payload to a row list, so single and createMany writes take one code path.
     */
    private toDatabaseRows(value: unknown): IDatabaseRow[] {
        if (Array.isArray(value)) {
            return value.filter(item => this.isDatabaseRow(item));
        }

        return this.isDatabaseRow(value) ? [value] : [];
    }

    /**
     * Fills `createdBy` and `updatedBy` on every row of a create payload, then recurses into nested
     * writes. A field the caller already set is left alone.
     */
    private stampCreate(
        model: string | undefined,
        data: unknown,
        actor: string
    ): void {
        for (const row of this.toDatabaseRows(data)) {
            if (
                this.modelHasField(model, 'createdBy') &&
                row.createdBy == null
            ) {
                row.createdBy = actor;
            }
            if (
                this.modelHasField(model, 'updatedBy') &&
                row.updatedBy == null
            ) {
                row.updatedBy = actor;
            }

            this.stampRelations(model, row, actor);
        }
    }

    /**
     * Fills `updatedBy` on every row of an update payload, then recurses into nested writes. A field
     * the caller already set is left alone.
     */
    private stampUpdate(
        model: string | undefined,
        data: unknown,
        actor: string
    ): void {
        for (const row of this.toDatabaseRows(data)) {
            if (
                this.modelHasField(model, 'updatedBy') &&
                row.updatedBy == null
            ) {
                row.updatedBy = actor;
            }

            this.stampRelations(model, row, actor);
        }
    }

    /**
     * Walks the row's relation fields and stamps each nested write against the RELATED model,
     * resolved from the DMMF rather than the parent's field set.
     */
    private stampRelations(
        model: string | undefined,
        row: IDatabaseRow,
        actor: string
    ): void {
        const relations = model ? this.modelRelations.get(model) : undefined;
        if (!relations) {
            return;
        }

        for (const [field, relatedModel] of relations) {
            const value = row[field];
            if (!this.isDatabaseRow(value)) {
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
        model: string,
        container: IDatabaseRow,
        actor: string
    ): void {
        this.stampCreate(model, container.create, actor);

        if (this.isDatabaseRow(container.createMany)) {
            this.stampCreate(model, container.createMany.data, actor);
        }

        for (const entry of this.toDatabaseRows(container.connectOrCreate)) {
            this.stampCreate(model, entry.create, actor);
        }

        for (const entry of this.toDatabaseRows(container.upsert)) {
            this.stampCreate(model, entry.create, actor);
            this.stampUpdate(model, entry.update, actor);
        }

        for (const entry of this.toDatabaseRows(container.update)) {
            this.stampNestedUpdateEntry(model, entry, actor);
        }

        for (const entry of this.toDatabaseRows(container.updateMany)) {
            this.stampNestedUpdateEntry(model, entry, actor);
        }
    }

    /**
     * Stamps one nested update entry. A nested to-many update is `{ where, data }`; a to-one update
     * is the payload itself.
     */
    private stampNestedUpdateEntry(
        model: string,
        entry: IDatabaseRow,
        actor: string
    ): void {
        if (this.isDatabaseRow(entry.data)) {
            this.stampUpdate(model, entry.data, actor);
            return;
        }

        this.stampUpdate(model, entry, actor);
    }
}
