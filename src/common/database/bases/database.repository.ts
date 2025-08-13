import {
    ClientSession,
    FilterQuery,
    Model,
    PipelineStage,
    PopulateOptions,
    Types,
    UpdateQuery,
} from 'mongoose';
import { IDatabaseRepository } from '@common/database/interfaces/database.repository.interface';
import {
    IDatabaseCount,
    IDatabaseCreate,
    IDatabaseCreateMany,
    IDatabaseDelete,
    IDatabaseDeleteMany,
    IDatabaseExist,
    IDatabaseExistReturn,
    IDatabaseFilter,
    IDatabaseFilterOperation,
    IDatabaseFindMany,
    IDatabaseFindManyWithPagination,
    IDatabaseFindOne,
    IDatabaseFindOneById,
    IDatabaseManyReturn,
    IDatabaseOrder,
    IDatabasePaginationReturn,
    IDatabaseRaw,
    IDatabaseRestore,
    IDatabaseRestoreMany,
    IDatabaseResult,
    IDatabaseReturn,
    IDatabaseSelect,
    IDatabaseSoftDelete,
    IDatabaseSoftDeleteMany,
    IDatabaseUpdate,
    IDatabaseUpdateAtomic,
    IDatabaseUpdateMany,
    IDatabaseUpsert,
} from '@common/database/interfaces/database.interface';
import { IDatabaseEntity } from '@common/database/interfaces/database.entity.interface';
import {
    DATABASE_ATOMIC_OPERATIONS,
    DATABASE_FILTER_OPERATIONS,
} from '@common/database/constants/database.constant';

/**
 * Abstract base repository class for database operations.
 *
 * Provides a comprehensive set of CRUD operations, soft delete functionality,
 * pagination support, and advanced querying capabilities for MongoDB through Mongoose.
 * All repository implementations should extend this base class to ensure consistency.
 *
 * @template TEntity - The entity type extending IDatabaseEntity
 * @template TModel - The Mongoose model type for the entity
 * @template TRaw - The aggregation pipeline type for raw queries
 * @template TTransaction - The transaction session type for atomic operations
 */
export abstract class DatabaseRepositoryBase<
    TEntity extends IDatabaseEntity,
    TModel extends Model<TEntity> = Model<TEntity>,
    TRaw extends PipelineStage[] = PipelineStage[],
    TTransaction = ClientSession,
> implements IDatabaseRepository<TEntity, TModel, TRaw, TTransaction>
{
    /**
     * Creates a new instance of the DatabaseRepositoryBase.
     * @param model - The Mongoose model to use for database operations.
     */
    constructor(model: TModel) {
        this._model = model;
    }

    /**
     * The Mongoose model instance used for database operations.
     * @readonly
     */
    readonly _model: TModel;

    /**
     * Validates that data is a non-empty object.
     * @private
     * @param data - The data to validate.
     * @param paramName - The parameter name for error message.
     * @throws {Error} When data is not a valid non-empty object.
     */
    private _validateNonEmptyObject(data: unknown, paramName = 'Data'): void {
        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error(`${paramName} must be a non-empty object`);
        }
    }

    /**
     * Validates that criteria is a non-empty object.
     * @private
     * @param criteria - The criteria to validate.
     * @param paramName - The parameter name for error message.
     * @throws {Error} When criteria is not a valid non-empty object.
     */
    private _validateCriteria(criteria: unknown, paramName = 'Criteria'): void {
        if (
            !criteria ||
            typeof criteria !== 'object' ||
            Object.keys(criteria).length === 0
        ) {
            throw new Error(`${paramName} must be a non-empty object`);
        }
    }

    /**
     * Validates that select is a valid object.
     * @private
     * @param select - The select to validate.
     * @throws {Error} When select is not a valid object.
     */
    private _validateSelect(select: unknown): void {
        if (select && typeof select !== 'object') {
            throw new Error('Select must be an object');
        }
    }

    /**
     * Validates pagination parameters.
     * @private
     * @param limit - The limit to validate.
     * @param skip - The skip to validate.
     * @throws {Error} When pagination parameters are invalid.
     */
    private _validatePagination(limit: number, skip: number): void {
        if (limit < 0) {
            throw new Error('Pagination limit must be a non-negative number');
        }
        if (skip < 0) {
            throw new Error('Pagination skip must be a non-negative number');
        }
    }

    /**
     * Creates a new MongoDB ObjectId.
     * @private
     * @returns A new ObjectId instance.
     */
    private _createNewId(): Types.ObjectId {
        return new Types.ObjectId();
    }

    /**
     * Checks if a value is a database filter operation.
     * @private
     * @param value - The value to check.
     * @returns True if the value is a filter operation, false otherwise.
     */
    private _isFilterOperation(
        value: unknown
    ): value is IDatabaseFilterOperation {
        if (!value || typeof value !== 'object') {
            return false;
        }

        return DATABASE_FILTER_OPERATIONS.some(
            op => op in (value as Record<string, unknown>)
        );
    }

    /**
     * Maps filter operation to MongoDB operators.
     * @private
     */
    private readonly FILTER_OPERATION_MAP = {
        gte: '$gte',
        gt: '$gt',
        lte: '$lte',
        lt: '$lt',
        equal: '$eq',
        in: '$in',
        notIn: '$nin',
        notEqual: '$ne',
    } as const;

    /**
     * Processes comparison filter operations.
     * @private
     * @param operation - The filter operation.
     * @param query - The query object to modify.
     */
    private _processComparisonOperations(
        operation: IDatabaseFilterOperation,
        query: Record<string, unknown>
    ): Record<string, unknown> {
        for (const [key, mongoOp] of Object.entries(
            this.FILTER_OPERATION_MAP
        )) {
            if (key in operation && operation[key] !== undefined) {
                query[mongoOp] = operation[key];
            }
        }

        return query;
    }

    /**
     * Processes text search filter operations.
     * @private
     * @param operation - The filter operation.
     * @param query - The query object to modify.
     */
    private _processTextOperations(
        operation: IDatabaseFilterOperation,
        query: Record<string, unknown>
    ): Record<string, unknown> {
        if ('contains' in operation && operation.contains !== undefined) {
            query.$regex = operation.contains;
            query.$options = 'i';
        }
        if ('notContains' in operation && operation.notContains !== undefined) {
            query.$not = { $regex: operation.notContains, $options: 'i' };
        }
        if ('startsWith' in operation && operation.startsWith !== undefined) {
            query.$regex = `^${operation.startsWith}`;
            query.$options = 'i';
        }
        if ('endsWith' in operation && operation.endsWith !== undefined) {
            query.$regex = `${operation.endsWith}$`;
            query.$options = 'i';
        }

        return query;
    }

    /**
     * Processes logical filter operations ($or, $and) by recursively resolving nested filter conditions.
     *
     * This method handles the logical operators in database filter operations by:
     * - Converting 'or' operations to MongoDB $or queries with recursive resolution
     * - Converting 'and' operations to MongoDB $and queries with recursive resolution
     * - Maintaining proper soft delete filtering context through recursive calls
     * - Supporting nested logical operations of arbitrary depth
     *
     * @private
     * @param operation - The filter operation containing logical operators (or/and).
     * @param query - The MongoDB query object to modify with logical operations.
     * @param withDeleted - Optional flag to include soft-deleted documents in nested queries.
     * @returns The modified query object with resolved logical operations.
     */
    private _processLogicalOperations(
        operation: IDatabaseFilterOperation,
        query: Record<string, unknown>,
        withDeleted?: boolean
    ): Record<string, unknown> {
        if (
            'or' in operation &&
            operation.or !== undefined &&
            Array.isArray(operation.or)
        ) {
            query.$or = operation.or.map(orOperation =>
                this._resolveWhere(
                    orOperation as IDatabaseFilter<TEntity>,
                    withDeleted
                )
            );
        }
        if (
            'and' in operation &&
            operation.and !== undefined &&
            Array.isArray(operation.and)
        ) {
            query.$and = operation.and.map(andOperation =>
                this._resolveWhere(
                    andOperation as IDatabaseFilter<TEntity>,
                    withDeleted
                )
            );
        }

        return query;
    }

    /**
     * Resolves complex filter operations into MongoDB-compatible query format.
     *
     * This method serves as the central processor for all database filter operations by:
     * - Processing comparison operations (gte, gt, lte, lt, equal, in, notIn, notEqual)
     * - Processing text search operations (contains, notContains, startsWith, endsWith)
     * - Processing logical operations (or, and) with recursive resolution
     * - Maintaining filter operation precedence and combining multiple operation types
     * - Preserving soft delete filtering context for nested operations
     *
     * The method orchestrates the transformation of high-level filter operations
     * into low-level MongoDB query operators, ensuring proper query structure
     * and maintaining query performance optimization.
     *
     * @private
     * @param operation - The filter operation object containing one or more operation types.
     * @param withDeleted - Optional flag to include soft-deleted documents in logical operations.
     * @returns The complete MongoDB query object with all resolved filter operations.
     */
    private _resolveFilterOperation(
        operation: IDatabaseFilterOperation,
        withDeleted?: boolean
    ): Record<string, unknown> {
        let query: Record<string, unknown> = {};

        query = {
            ...query,
            ...this._processComparisonOperations(operation, query),
        };
        query = {
            ...query,
            ...this._processTextOperations(operation, query),
        };
        query = {
            ...query,
            ...this._processLogicalOperations(operation, query, withDeleted),
        };

        return query;
    }

    /**
     * Resolves database filter criteria into MongoDB-compatible query format with comprehensive operation support.
     *
     * This method is the primary entry point for transforming high-level database filter criteria
     * into optimized MongoDB queries. It performs the following key operations:
     *
     * **Logical Operations Processing:**
     * - Handles top-level $or operations by recursively resolving each condition
     * - Handles top-level $and operations by recursively resolving each condition
     * - Supports nested logical operations of arbitrary depth and complexity
     *
     * **Field-Level Filter Resolution:**
     * - Processes individual field filters through _resolveFilterOperation
     * - Supports complex filter operations (comparison, text search, logical)
     * - Maintains type safety and proper value assignment for direct field matches
     *
     * **Soft Delete Management:**
     * - Automatically applies soft delete filtering based on withDeleted flag
     * - Allows explicit deletion state overrides through where.deleted property
     * - Ensures consistent soft delete behavior across all query operations
     *
     * **Query Optimization:**
     * - Combines multiple filter conditions efficiently
     * - Maintains MongoDB query structure for optimal performance
     * - Preserves filter operation precedence and logical grouping
     *
     * @private
     * @param where - The high-level filter criteria object containing field filters and logical operations.
     * @param withDeleted - Optional flag controlling soft-deleted document inclusion:
     *                     - true: includes both deleted and non-deleted documents
     *                     - false/undefined: excludes soft-deleted documents (default behavior)
     * @returns A fully resolved MongoDB FilterQuery compatible with Mongoose operations,
     *          including proper soft delete filtering and optimized query structure.
     */
    private _resolveWhere(
        where: IDatabaseFilter<TEntity>,
        withDeleted?: boolean
    ): FilterQuery<TEntity> {
        const resolvedWhere: Record<string, unknown> = {};

        // Handle logical operations at the top level
        if (where.or && Array.isArray(where.or)) {
            resolvedWhere.$or = where.or.map(orCondition =>
                this._resolveWhere(
                    orCondition as IDatabaseFilter<TEntity>,
                    withDeleted
                )
            );
        }

        if (where.and && Array.isArray(where.and)) {
            resolvedWhere.$and = where.and.map(andCondition =>
                this._resolveWhere(
                    andCondition as IDatabaseFilter<TEntity>,
                    withDeleted
                )
            );
        }

        for (const key in where) {
            if (key === 'or' || key === 'and') {
                continue; // Skip or and and as they are already handled above
            }

            const value = where[key];
            if (value !== undefined) {
                if (this._isFilterOperation(value)) {
                    resolvedWhere[key] = this._resolveFilterOperation(
                        value,
                        withDeleted
                    );
                } else {
                    resolvedWhere[key] = value;
                }
            }
        }

        // Handle soft delete filtering
        if (withDeleted === true) {
            resolvedWhere.deleted = {
                $in: [false, true],
            };
        } else {
            resolvedWhere.deleted = false;
        }

        // If the deleted field is explicitly set to true or false, include it in the query
        if (where.deleted === true || where.deleted === false) {
            resolvedWhere.deleted = where.deleted;
        }

        return resolvedWhere as FilterQuery<TEntity>;
    }

    /**
     * Checks if a value is an atomic update operation.
     * @private
     * @param value - The value to check.
     * @returns True if the value is an atomic update operation, false otherwise.
     */
    private _isAtomicUpdateOperation(
        value: unknown
    ): value is IDatabaseUpdateAtomic {
        if (!value || typeof value !== 'object') {
            return false;
        }

        return DATABASE_ATOMIC_OPERATIONS.some(
            op => op in (value as Record<string, unknown>)
        );
    }

    /**
     * Resolves atomic update operations to MongoDB update operators.
     * @private
     * @param field - The field name to apply the atomic operation to.
     * @param data - The atomic update operation data.
     * @returns The resolved MongoDB update query with proper operators.
     * @throws {Error} When the data is invalid or contains unsupported operations.
     */
    private _resolveDataUpdateAtomic(
        field: string,
        data: IDatabaseUpdateAtomic
    ): UpdateQuery<TEntity> {
        if (!this._isAtomicUpdateOperation(data)) {
            throw new Error(
                'Data must contain one of increment, decrement, multiply, or divide'
            );
        }

        // Check for increment operation
        if ('increment' in data && data.increment !== undefined) {
            if (typeof data.increment !== 'number') {
                throw new Error('Increment value must be a number');
            }
            return {
                $inc: {
                    [field]: data.increment,
                },
            } as UpdateQuery<TEntity>;
        }

        // Check for decrement operation
        if ('decrement' in data && data.decrement !== undefined) {
            if (typeof data.decrement !== 'number') {
                throw new Error('Decrement value must be a number');
            }
            return {
                $inc: {
                    [field]: -data.decrement,
                },
            } as UpdateQuery<TEntity>;
        }

        // Check for multiply operation
        if ('multiply' in data && data.multiply !== undefined) {
            if (typeof data.multiply !== 'number') {
                throw new Error('Multiply value must be a number');
            }
            return {
                $mul: {
                    [field]: data.multiply,
                },
            } as UpdateQuery<TEntity>;
        }

        // Check for divide operation
        if ('divide' in data && data.divide !== undefined) {
            if (typeof data.divide !== 'number') {
                throw new Error('Divide value must be a number');
            }
            if (data.divide === 0) {
                throw new Error('Cannot divide by zero');
            }
            return {
                $mul: {
                    [field]: 1 / data.divide,
                },
            } as UpdateQuery<TEntity>;
        }

        throw new Error('Invalid atomic operation data');
    }

    /**
     * Processes atomic update operations for a field.
     * @private
     * @param key - The field name.
     * @param value - The atomic operation value.
     * @param updateData - The update data object to modify.
     */
    private _processAtomicOperation(
        key: string,
        value: IDatabaseUpdateAtomic,
        updateData: UpdateQuery<TEntity>
    ): UpdateQuery<TEntity> {
        const atomicUpdate = this._resolveDataUpdateAtomic(key, value);

        if (atomicUpdate.$inc) {
            updateData.$inc = {
                ...updateData.$inc,
                ...atomicUpdate.$inc,
            };
        } else if (atomicUpdate.$mul) {
            updateData.$mul = {
                ...updateData.$mul,
                ...atomicUpdate.$mul,
            };
        }

        return updateData;
    }

    /**
     * Processes regular field updates.
     * @private
     * @param key - The field name.
     * @param value - The field value.
     * @param updateData - The update data object to modify.
     */
    private _processRegularUpdate(
        key: string,
        value: unknown,
        updateData: UpdateQuery<TEntity>
    ): UpdateQuery<TEntity> {
        return (updateData.$set = {
            ...updateData.$set,
            [key]: value,
        });
    }

    /**
     * Adds timestamp and user metadata to update data.
     * @private
     * @param updateData - The update data object to modify.
     * @param entity - The entity containing user metadata.
     */
    private _addUpdateMetadata(
        updateData: UpdateQuery<TEntity>,
        entity: Partial<TEntity>
    ): UpdateQuery<TEntity> {
        const now = Date.now();

        updateData.$set = {
            ...updateData.$set,
            updatedAt: now,
        };

        if (entity.updatedBy !== undefined) {
            updateData.$set.updatedBy = entity.updatedBy;
        }

        return updateData;
    }

    /**
     * Resolves update data by handling increment/decrement operations and standard field updates.
     * Automatically sets updatedAt and updatedBy fields.
     * @private
     * @param data - The update data which can be either increment/decrement operations or direct field updates.
     * @returns The resolved MongoDB update query with proper operators and metadata.
     */
    private _resolveDataUpdate(
        data: IDatabaseUpdate<Omit<TEntity, 'id'>, TTransaction>['data']
    ): UpdateQuery<TEntity> {
        const entity = data as Partial<TEntity>;
        let updateData: UpdateQuery<TEntity> = {};
        const keys: string[] = Object.keys(data);

        for (const key of keys) {
            const value = data[key];

            if (value !== undefined && this._isAtomicUpdateOperation(value)) {
                updateData = {
                    ...updateData,
                    ...this._processAtomicOperation(
                        key,
                        value as IDatabaseUpdateAtomic,
                        updateData
                    ),
                };
            } else {
                updateData = {
                    ...updateData,
                    ...this._processRegularUpdate(key, value, updateData),
                };
            }
        }

        updateData = {
            ...updateData,
            ...this._addUpdateMetadata(updateData, entity),
        };
        return updateData;
    }

    /**
     * Resolves create data by generating ObjectId, setting timestamps, and initializing entity metadata.
     * Automatically sets createdAt, updatedAt, createdBy, updatedBy, and deleted fields.
     * @private
     * @param data - The creation data containing entity fields and optional metadata.
     * @returns The resolved entity data with MongoDB ObjectId and proper metadata fields.
     */
    private _resolveDataCreate(
        data: IDatabaseCreate<TEntity, TTransaction>['data']
    ): Partial<TEntity> {
        const now = Date.now();
        const { _id, ...restData } = data;

        return {
            ...restData,
            _id: _id ? new Types.ObjectId(_id) : this._createNewId(),
            createdAt: restData.createdAt ?? now,
            updatedAt: restData.createdAt ?? now,
            createdBy: restData.createdBy ?? null,
            updatedBy: restData.createdBy ?? null,
            deleted: false,
        } as unknown as Partial<TEntity>;
    }

    /**
     * Resolves order configuration to Mongoose sort format.
     * Converts the IDatabaseOrder format (single object or array) to the format expected by Mongoose.
     * @private
     * @param order - The order configuration (single object or array).
     * @returns The resolved sort object for Mongoose or undefined if no order is provided.
     */
    private _resolveOrder<T = TEntity>(
        order: IDatabaseOrder<T>
    ): Record<string, 1 | -1> | undefined {
        if (!order) {
            return undefined;
        }

        const sortObject: Record<string, 1 | -1> = {};

        // Handle both single object and array of objects
        const orderItems = Array.isArray(order) ? order : [order];

        if (orderItems.length === 0) {
            return undefined;
        }

        for (const orderItem of orderItems) {
            if (!orderItem || typeof orderItem !== 'object') {
                continue;
            }

            for (const [field, direction] of Object.entries(orderItem)) {
                if (direction !== undefined) {
                    sortObject[field] = direction === 'asc' ? 1 : -1;
                }
            }
        }

        return Object.keys(sortObject).length > 0 ? sortObject : undefined;
    }

    /**
     * Gets all registered Mongoose model names
     * @private
     * @returns Array of available model names
     */
    private _getAvailableModels(): string[] {
        return this._model.db.modelNames();
    }

    /**
     * Resolves join configuration to Mongoose PopulateOptions array.
     *
     * Converts the IDatabaseJoin interface format to PopulateOptions for Mongoose populate.
     * This method transforms the custom join configuration into the format expected by Mongoose's
     * populate method, supporting nested joins, field selection, filtering, and pagination.
     *
     * Each join can specify:
     * - Path relationship mapping with custom local/foreign field configuration
     * - Field selection for populated documents
     * - Filtering conditions on populated documents
     * - Pagination (limit/skip) for populated arrays
     * - Nested population for related documents
     *
     * @private
     * @param join - The join configuration object where keys represent the populate path
     *               and values contain the join details including model, filters, and options.
     * @returns An array of PopulateOptions configured for Mongoose populate, or undefined if no join is provided.
     */
    private _resolveJoin(join: any): PopulateOptions[] | undefined {
        console.log('Resolving join configuration:', join);
        // TODO: COBA CHECK APAKAH JOIN BISA MENGGUNAKAN SCHEMA SECARA LANGSUNG
        // TODO: CHECK JOIN INTERFACE APAKAH BISA INHERIT DARI SCHEMA SECARA LANGSUNG DAN DETECTLY MENGGUNAKAN MODEL MENGGUNAKAN REF

        if (
            !join ||
            typeof join !== 'object' ||
            Object.keys(join).length === 0
        ) {
            return undefined;
        }

        const availableModels = this._getAvailableModels();
        console.log('model', this._model);
        console.log('schema', this._model.schema);
        console.log('availableModels', availableModels);
        const populateOptions: PopulateOptions[] = [];

        // for (const [path, joinDetail] of Object.entries(join)) {
        //     if (!joinDetail || typeof joinDetail !== 'object') {
        //         continue;
        //     }

        //     // Validate that the model exists
        //     // TODO: VALIDATE MODEL DARI SCHEMA SECARA LANGSUNG
        //     this._validateModel(joinDetail.from);

        //     const populateOption: PopulateOptions = {
        //         path,
        //         localField: path,
        //         foreignField: '_id',
        //         model: joinDetail.from,
        //         justOne: true, // TODO: CHECK DARI SCHEMA JIKA JOIN MULTIPLE ATAU TIDAK
        //         strictPopulate: true,
        //         ordered: true, // SAFETY RACK
        //         forceRepopulate: true, // SAFETY RACK
        //     };

        //     // Handle custom field mapping (localField/foreignField)
        //     // TODO: CHECK JIKA JOIN DETAIL BISA MENGGUNAKAN SCHEMA SECARA LANGSUNG
        //     if (joinDetail.on) {
        //         populateOption.localField = joinDetail.on.localField;
        //         populateOption.foreignField = joinDetail.on.foreignField;
        //     }

        //     // Handle field selection
        //     if (joinDetail.select) {
        //         populateOption.select = joinDetail.select;
        //     }

        //     // Handle filtering conditions
        //     if (joinDetail.where) {
        //         populateOption.match = this._resolveWhere(
        //             joinDetail.where as IDatabaseFilter<TEntity>
        //         );
        //     }

        //     const options: QueryOptions = {
        //         lean: true,
        //         strict: true,
        //         ordered: true,
        //     };
        //     if (joinDetail.multiple && joinDetail.multiple.enabled) {
        //         // TODO: CHECK DARI SCHEMA JIKA JOIN MULTIPLE ATAU TIDAK
        //         populateOption.justOne = false;

        //         if (joinDetail.multiple.limit !== undefined) {
        //             options.limit = joinDetail.multiple.limit;
        //         }

        //         if (joinDetail.multiple.skip !== undefined) {
        //             options.skip = joinDetail.multiple.skip;
        //         }
        //     }

        //     if (Object.keys(options).length > 0) {
        //         populateOption.options = options;
        //     }

        //     // Handle nested joins recursively
        //     if (joinDetail.join) {
        //         const nestedPopulate = this._resolveJoin(joinDetail.join);
        //         if (nestedPopulate && nestedPopulate.length > 0) {
        //             populateOption.populate = nestedPopulate;
        //         }
        //     }

        //     populateOptions.push(populateOption);
        // }

        return populateOptions.length > 0 ? populateOptions : undefined;
    }

    /**
     * Finds multiple documents based on the provided queries.
     * @param queries - Optional queries object containing filter criteria, join options, sorting, selection, pagination, and deletion flags.
     * @param queries.where - The criteria to filter the documents.
     * @param queries.join - Optional join options to populate related fields.
     * @param queries.order - Optional sorting order for the results.
     * @param queries.select - Optional fields to select in the returned documents.
     * @param queries.limit - Optional maximum number of documents to return.
     * @param queries.skip - Optional number of documents to skip for pagination.
     * @param queries.withDeleted - Optional flag to include deleted documents.
     * @param queries.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to an array of found documents.
     * @throws {Error} When where criteria or select fields are not valid objects.
     */
    async findMany<T = TEntity>(
        queries?: IDatabaseFindMany<TEntity, TTransaction>
    ): Promise<T[]> {
        if (queries === undefined || queries === null) {
            const items = (await this._model.find().lean()) as T[];
            return items;
        }

        const {
            where,
            join,
            order,
            select,
            limit,
            skip,
            withDeleted,
            transaction,
        } = queries;

        if (where) {
            this._validateCriteria(where, 'Where criteria');
        }
        this._validateSelect(select);

        const resolvedWhere = this._resolveWhere(
            where as IDatabaseFilter<TEntity>,
            withDeleted
        );
        const findItems = this._model.find(resolvedWhere);

        if (join) {
            const populateOptions = this._resolveJoin(join);
            findItems.populate(populateOptions);
        }

        if (order) {
            const resolvedOrder = this._resolveOrder(order);
            if (resolvedOrder) {
                findItems.sort(resolvedOrder);
            }
        }

        if (select) {
            findItems.select(select);
        }

        if (limit !== undefined && limit >= 0) {
            findItems.limit(limit);
        }

        if (skip !== undefined && skip >= 0) {
            findItems.skip(skip);
        }

        if (transaction) {
            findItems.session(transaction as ClientSession);
        }

        const items = await findItems.lean();
        return items as T[];
    }

    /**
     * Finds multiple documents with pagination support.
     * @param options - The pagination options.
     * @param options.limit - The maximum number of documents to return.
     * @param options.skip - The number of documents to skip for pagination.
     * @param options.where - Optional criteria to filter the documents.
     * @param options.join - Optional join options to populate related fields.
     * @param options.order - Optional sorting order for the results.
     * @param options.select - Optional fields to select in the returned documents.
     * @param options.withDeleted - Optional flag to include deleted documents.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to a paginated result containing the items and metadata.
     * @throws {Error} When limit or skip are negative numbers, or when where/select criteria are invalid.
     */
    async findManyWithPagination<T = TEntity>({
        limit,
        skip,
        where,
        join,
        order,
        select,
        withDeleted,
        transaction,
    }: IDatabaseFindManyWithPagination<TEntity, TTransaction>): Promise<
        IDatabasePaginationReturn<T>
    > {
        if (where) {
            this._validateCriteria(where, 'Where criteria');
        }
        this._validatePagination(limit, skip);
        this._validateSelect(select);

        const resolvedWhere = this._resolveWhere(
            where as IDatabaseFilter<TEntity>,
            withDeleted
        );
        const findItems = this._model
            .find(resolvedWhere)
            .limit(limit)
            .skip(skip);

        if (join) {
            const populateOptions = this._resolveJoin(join);
            findItems.populate(populateOptions);
        }

        if (order) {
            const resolvedOrder = this._resolveOrder(order);
            if (resolvedOrder) {
                findItems.sort(resolvedOrder);
            }
        }

        if (select) {
            findItems.select(select);
        }

        if (transaction) {
            findItems.session(transaction as ClientSession);
        }

        const items = await findItems.lean();
        const count = await this._model.countDocuments(resolvedWhere).lean();

        return {
            items: items as T[],
            count,
            page: Math.floor(skip / limit) + 1,
            totalPage: Math.ceil(count / limit),
        };
    }

    /**
     * Counts the number of documents matching the provided criteria.
     * @param queries - Optional queries to filter the count.
     * @param queries.where - The criteria to filter the documents.
     * @param queries.withDeleted - Optional flag to include deleted documents.
     * @param queries.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the count of matching documents.
     * @throws {Error} When where criteria is not a valid non-empty object.
     */
    async count(
        queries?: IDatabaseCount<TEntity, TTransaction>
    ): Promise<number> {
        if (queries === undefined || queries === null) {
            return this._model.countDocuments().lean();
        }

        const { where, withDeleted, transaction } = queries;

        if (where) {
            this._validateCriteria(where, 'Where criteria');
        }

        const resolvedWhere = this._resolveWhere(
            where as IDatabaseFilter<TEntity>,
            withDeleted
        );
        const countQuery = this._model.countDocuments(resolvedWhere);

        if (transaction) {
            countQuery.session(transaction as ClientSession);
        }

        return countQuery.lean();
    }

    /**
     * Finds a single document based on the provided criteria.
     * @param options - The find options.
     * @param options.where - The criteria to find the document.
     * @param options.join - Optional join options to populate related fields.
     * @param options.select - Optional fields to select in the returned document.
     * @param options.withDeleted - Optional flag to include deleted documents.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the found document or null if not found.
     * @throws {Error} When find criteria is not provided or select is not a valid object.
     */
    async findOne<
        TSelect extends IDatabaseSelect<TEntity> | undefined = undefined,
    >({
        where,
        join,
        select,
        withDeleted,
        transaction,
    }: IDatabaseFindOne<TEntity, TTransaction> & {
        select?: TSelect;
    }): Promise<IDatabaseReturn<TEntity, TSelect> | null> {
        this._validateCriteria(where, 'Where criteria');
        this._validateSelect(select);

        const resolvedWhere = this._resolveWhere(
            where as IDatabaseFilter<TEntity>,
            withDeleted
        );
        const findItem = this._model.findOne(resolvedWhere);

        if (join) {
            const populateOptions = this._resolveJoin(join);
            findItem.populate(populateOptions);
        }

        if (select) {
            findItem.select(select);
        }

        if (transaction) {
            findItem.session(transaction as ClientSession);
        }

        const item = await findItem.lean();
        return item as unknown as IDatabaseResult<TEntity, TSelect> | null;
    }

    /**
     * Finds a single document by its ID.
     * @param options - The find by ID options.
     * @param options._id - The ID of the document to find.
     * @param options.join - Optional join options to populate related fields.
     * @param options.select - Optional fields to select in the returned document.
     * @param options.withDeleted - Optional flag to include deleted documents.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the found document or null if not found.
     * @throws {Error} When ID is not a valid non-empty string or select is not a valid object.
     */
    async findOneById<T = TEntity>({
        where,
        join,
        select,
        withDeleted,
        transaction,
    }: IDatabaseFindOneById<TTransaction>): Promise<T | null> {
        this._validateCriteria(where, 'Where criteria');
        this._validateSelect(select);

        const resolvedWhere = this._resolveWhere(
            where as IDatabaseFilter<TEntity>,
            withDeleted
        );
        const findItem = this._model.findOne(resolvedWhere);

        if (join) {
            const populateOptions = this._resolveJoin(join);
            findItem.populate(populateOptions);
        }

        if (select) {
            findItem.select(select);
        }

        if (transaction) {
            findItem.session(transaction as ClientSession);
        }

        const item = await findItem.lean();
        return item as T | null;
    }

    /**
     * Creates a new document in the database.
     * @param options - The creation options.
     * @param options.data - The data to create the document with.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the database return object containing the created document data.
     * @throws {Error} When the data is not a non-empty object.
     */
    async create({
        data,
        transaction,
    }: IDatabaseCreate<TEntity, TTransaction>): Promise<TEntity> {
        this._validateNonEmptyObject(data, 'Data');

        const resolvedData = this._resolveDataCreate(data);
        const createItems = await this._model.create([resolvedData], {
            session: transaction as ClientSession,
        });
        const item = createItems[0].toObject();
        return item as TEntity;
    }

    /**
     * Updates a document based on the provided criteria and data.
     * @param options - The update options.
     * @param options.data - The data to update the document with (supports both direct field updates and increment/decrement operations).
     * @param options.where - The criteria to find the document to update.
     * @param options.withDeleted - Optional flag to include deleted documents in the search.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the updated document.
     * @throws {Error} When the data or where criteria are not valid non-empty objects.
     */
    async update({
        data,
        where,
        withDeleted,
        transaction,
    }: IDatabaseUpdate<TEntity, TTransaction>): Promise<TEntity> {
        this._validateCriteria(where, 'Where criteria');
        this._validateNonEmptyObject(data, 'Data');

        const resolvedData = this._resolveDataUpdate(data);
        const resolvedWhere = this._resolveWhere(where, withDeleted);
        const updateItem = this._model.findOneAndUpdate(
            resolvedWhere,
            resolvedData,
            {
                new: true,
            }
        );

        if (transaction) {
            updateItem.session(transaction as ClientSession);
        }

        const updated = await updateItem.lean();
        return updated as TEntity;
    }

    /**
     * Permanently deletes a document based on the provided criteria.
     * @param options - The deletion options.
     * @param options.where - The criteria to find the document to delete.
     * @param options.withDeleted - Optional flag to include deleted documents in the search.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the deleted document.
     * @throws {Error} When the where criteria is not a valid non-empty object.
     */
    async delete({
        where,
        withDeleted,
        transaction,
    }: IDatabaseDelete<TEntity, TTransaction>): Promise<TEntity> {
        this._validateCriteria(where, 'Where criteria');

        const resolvedWhere = this._resolveWhere(where, withDeleted);
        const deleteItem = this._model.findOneAndDelete(resolvedWhere, {
            new: false,
        });

        if (transaction) {
            deleteItem.session(transaction as ClientSession);
        }

        const deleted = await deleteItem.lean();
        return deleted as TEntity;
    }

    /**
     * Checks if a document exists based on the provided criteria.
     * @param options - The existence check options.
     * @param options.where - The criteria to find the document.
     * @param options.withDeleted - Optional flag to include deleted documents in the search.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to an object with the document ID if it exists, or null if it doesn't.
     * @throws {Error} When the where criteria is not a valid non-empty object.
     */
    async exists({
        where,
        withDeleted,
        transaction,
    }: IDatabaseExist<
        TEntity,
        TTransaction
    >): Promise<IDatabaseExistReturn | null> {
        this._validateCriteria(where, 'Where criteria');

        const resolvedWhere = this._resolveWhere(where, withDeleted);
        const existsQuery = this._model.exists(resolvedWhere).select('_id');

        if (transaction) {
            existsQuery.session(transaction as ClientSession);
        }

        const result = await existsQuery.lean();
        return result ? { _id: result._id } : null;
    }

    /**
     * Upserts a document by finding it with the provided criteria and updating it with the provided data.
     * If the document does not exist, it creates a new one with the create data.
     * @param options - The upsert options.
     * @param options.create - The data to create the document with if it does not exist.
     * @param options.update - The data to update the document with if it exists.
     * @param options.where - The criteria to find the document to update.
     * @param options.withDeleted - Optional flag to include deleted documents in the search.
     * @param options.transaction - Optional transaction session for atomic operations.
     * @returns A promise that resolves to the updated or created document.
     * @throws {Error} When the create data, update data, or where criteria are not valid non-empty objects.
     */
    async upsert({
        create,
        update,
        where,
        withDeleted,
        transaction,
    }: IDatabaseUpsert<TEntity, TTransaction>): Promise<TEntity> {
        this._validateCriteria(where, 'Where criteria');
        this._validateNonEmptyObject(create, 'Create data');
        this._validateNonEmptyObject(update, 'Update data');

        const resolvedUpdateData = this._resolveDataUpdate(update);
        const resolvedCreateData = this._resolveDataCreate(create);
        const resolvedWhere = this._resolveWhere(where, withDeleted);
        const upsertItem = this._model.findOneAndUpdate(
            resolvedWhere,
            {
                $setOnInsert: resolvedCreateData,
                $set: resolvedUpdateData,
            },
            {
                new: true,
                upsert: true,
            }
        );

        if (transaction) {
            upsertItem.session(transaction as ClientSession);
        }

        const upsert = await upsertItem.lean();
        return upsert as TEntity;
    }

    /**
     * Executes a raw MongoDB aggregation pipeline query.
     *
     * This method allows executing complex MongoDB aggregation pipelines directly,
     * providing full access to MongoDB's aggregation framework capabilities.
     * The aggregation pipeline is executed using the model's aggregate method.
     *
     * @template T - The expected return type of the aggregation result.
     * @param options - The raw query options containing the aggregation pipeline and optional transaction.
     * @param options.raw - The MongoDB aggregation pipeline stages array to execute. Must be a non-empty array of pipeline stages.
     * @param options.transaction - Optional transaction session for atomic operations. If provided, the aggregation will be executed within this session.
     * @returns A promise that resolves to the result of the aggregation query as type T.
     * @throws {Error} When the raw pipeline is falsy (null, undefined, empty array, etc.).
     */
    async raw<T>({
        raw,
        transaction,
    }: IDatabaseRaw<TRaw, TTransaction>): Promise<T> {
        if (!raw) {
            throw new Error('Raw must be a non-empty');
        }

        const executeRaw = this._model.aggregate(raw);

        if (transaction) {
            executeRaw.session(transaction as ClientSession);
        }

        const updated = (await executeRaw) as T;
        return updated;
    }

    /**
     * Creates multiple documents in the database.
     * @param data - An array of data to create the documents with.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns An object containing the count of created documents and their IDs.
     */
    async createMany({
        data,
        transaction,
    }: IDatabaseCreateMany<
        TEntity,
        TTransaction
    >): Promise<IDatabaseManyReturn> {
        this._validateNonEmptyObject(data, 'Data');

        const entities = data.map(
            (item: IDatabaseCreate<TEntity, TTransaction>['data']) =>
                this._resolveDataCreate(item)
        );
        const createItems = await this._model.insertMany(entities, {
            rawResult: true,
            session: transaction as ClientSession,
        });

        return {
            count: createItems.insertedCount,
            ids: Object.values(createItems.insertedIds).map(
                (_id: Types.ObjectId) => _id
            ),
        };
    }

    /**
     * Updates multiple documents based on the provided data and criteria.
     * @param data - An array of data to update the documents with.
     * @param where - The criteria to find the documents to update.
     * @param withDeleted - Optional flag to include deleted documents.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns An object containing the count of updated documents.
     */
    async updateMany({
        data,
        where,
        withDeleted,
        transaction,
    }: IDatabaseUpdateMany<
        TEntity,
        TTransaction
    >): Promise<IDatabaseManyReturn> {
        this._validateCriteria(where, 'Where criteria');
        this._validateNonEmptyObject(data, 'Data');

        const resolvedData = this._resolveDataUpdate(data);
        const resolvedWhere = this._resolveWhere(where, withDeleted);
        const updateItems = await this._model.updateMany(
            resolvedWhere,
            resolvedData,
            {
                rawResult: true,
                session: transaction as ClientSession,
            }
        );

        return {
            count: updateItems.modifiedCount,
        };
    }

    /**
     * Deletes multiple documents based on the provided criteria.
     * @param where - The criteria to find the documents to delete.
     * @param withDeleted - Optional flag to include deleted documents.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns An object containing the count of deleted documents.
     */
    async deleteMany({
        where,
        withDeleted,
        transaction,
    }: IDatabaseDeleteMany<
        TEntity,
        TTransaction
    >): Promise<IDatabaseManyReturn> {
        this._validateCriteria(where, 'Where criteria');

        const resolvedWhere = this._resolveWhere(where, withDeleted);
        const deleteItems = await this._model.deleteMany(resolvedWhere, {
            rawResult: true,
            session: transaction as ClientSession,
        });

        return {
            count: deleteItems.deletedCount,
        };
    }

    /**
     * Soft deletes a document based on the provided criteria and data.
     * @param where - The criteria to find the document to soft delete.
     * @param data - The data to update the document with, including deletedBy.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns The soft-deleted document.
     */
    async softDelete({
        where,
        data,
        transaction,
    }: IDatabaseSoftDelete<TEntity, TTransaction>): Promise<TEntity> {
        this._validateCriteria(where, 'Where criteria');
        if (data) {
            this._validateNonEmptyObject(data, 'Data');
        }

        const now = Date.now();
        const updateData: UpdateQuery<TEntity> = {
            $set: {
                ...(data || {}),
                deleted: true,
                deletedAt: now,
                updatedAt: now,
            },
        };

        if (data?.deletedBy) {
            updateData.$set.updatedBy = data.deletedBy;
        }

        const resolvedWhere = this._resolveWhere(where, false);
        const updateItem = this._model.findOneAndUpdate(
            resolvedWhere,
            updateData,
            {
                new: true,
            }
        );

        if (transaction) {
            updateItem.session(transaction as ClientSession);
        }

        const updated = await updateItem.lean();
        return updated as TEntity;
    }

    /**
     * Restores a soft-deleted document based on the provided criteria and data.
     * @param where - The criteria to find the document to restore.
     * @param data - The data to update the document with, including deletedBy.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns The restored document.
     */
    async restore({
        where,
        data,
        transaction,
    }: IDatabaseRestore<TEntity, TTransaction>): Promise<TEntity> {
        this._validateCriteria(where, 'Where criteria');
        if (data) {
            this._validateNonEmptyObject(data, 'Data');
        }

        const now = Date.now();
        const resolvedWhere = this._resolveWhere(where, true);
        const updateData: UpdateQuery<TEntity> = {
            $set: {
                deleted: false,
                updatedAt: now,
                deletedAt: null,
                deletedBy: null,
            },
        };

        if (data?.restoreBy) {
            updateData.$set.updatedBy = data.restoreBy;
        }

        const restoreItem = this._model.findOneAndUpdate(
            resolvedWhere,
            updateData,
            { new: true }
        );

        if (transaction) {
            restoreItem.session(transaction as ClientSession);
        }

        const restored = await restoreItem.lean();
        return restored as TEntity;
    }

    /**
     * Soft deletes multiple documents based on the provided criteria and data.
     * @param where - The criteria to find the documents to soft delete.
     * @param data - The data to update the documents with, including deletedBy.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns An object containing the count of soft-deleted documents.
     */
    async softDeleteMany({
        where,
        data,
        transaction,
    }: IDatabaseSoftDeleteMany<
        TEntity,
        TTransaction
    >): Promise<IDatabaseManyReturn> {
        this._validateCriteria(where, 'Where criteria');
        if (data) {
            this._validateNonEmptyObject(data, 'Data');
        }

        const now = Date.now();
        const updateData: UpdateQuery<TEntity> = {
            $set: {
                ...(data || {}),
                deleted: true,
                deletedAt: now,
                updatedAt: now,
            },
        };

        if (data?.deletedBy) {
            updateData.$set.updatedBy = data.deletedBy;
        }

        const resolvedWhere = this._resolveWhere(where, false);
        const updateItems = await this._model.updateMany(
            resolvedWhere,
            updateData,
            { rawResult: true, session: transaction as ClientSession }
        );

        return {
            count: updateItems.modifiedCount,
        };
    }

    /**
     * Restores multiple soft-deleted documents based on the provided criteria and data.
     * @param where - The criteria to find the documents to restore.
     * @param data - The data to update the documents with, including restoreBy.
     * @param transaction - Optional transaction session for atomic operations.
     * @returns An object containing the count of restored documents.
     */
    async restoreMany({
        where,
        data,
        transaction,
    }: IDatabaseRestoreMany<
        TEntity,
        TTransaction
    >): Promise<IDatabaseManyReturn> {
        this._validateCriteria(where, 'Where criteria');
        if (data) {
            this._validateNonEmptyObject(data, 'Data');
        }

        const now = Date.now();
        const resolvedWhere = this._resolveWhere(where, true);
        const updateData: UpdateQuery<TEntity> = {
            $set: {
                deleted: false,
                updatedAt: now,
                deletedAt: null,
                deletedBy: null,
            },
        };

        if (data?.restoreBy) {
            updateData.$set.updatedBy = data.restoreBy;
        }

        const restoreItems = await this._model.updateMany(
            resolvedWhere,
            updateData,
            { rawResult: true, session: transaction as ClientSession }
        );

        return {
            count: restoreItems.modifiedCount,
        };
    }

    /**
     * Executes a callback function within a database transaction context.
     * Automatically handles session creation, transaction management, and cleanup.
     * @template T - The return type of the callback function.
     * @param callback - The function to execute within the transaction context.
     * @returns A promise that resolves to the callback's return value.
     * @throws Propagates any errors that occur during transaction execution.
     */
    async withTransaction<T = void>(
        callback: (session: TTransaction) => Promise<T>
    ): Promise<T> {
        const session = await this._model.startSession();

        try {
            return session.withTransaction(async () => {
                return callback(session as TTransaction);
            }) as Promise<T>;
        } catch (error) {
            throw error;
        } finally {
            await session.endSession();
        }
    }

    /**
     * Creates a new database transaction session.
     * @returns A promise that resolves to a new transaction session.
     */
    async createTransaction(): Promise<TTransaction> {
        return this._model.startSession() as Promise<TTransaction>;
    }

    /**
     * Commits the specified transaction session.
     * @param session - The transaction session to commit.
     * @returns A promise that resolves when the transaction is committed.
     */
    async commitTransaction(session: TTransaction): Promise<void> {
        await (session as ClientSession).commitTransaction();
    }

    /**
     * Aborts the specified transaction session and rolls back all changes.
     * @param session - The transaction session to abort.
     * @returns A promise that resolves when the transaction is aborted.
     */
    async abortTransaction(session: TTransaction): Promise<void> {
        await (session as ClientSession).abortTransaction();
    }
}
