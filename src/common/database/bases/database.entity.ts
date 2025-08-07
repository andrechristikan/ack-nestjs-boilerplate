import { DatabaseProp } from '@common/database/decorators/database.decorator';
import { Types } from 'mongoose';

/**
 * Base class for all database entities.
 *
 * Provides common properties for all entities including timestamps, audit fields,
 * soft delete functionality, and version control for optimistic concurrency.
 *
 */
export class DatabaseEntityBase {
    @DatabaseProp({
        required: true,
        type: Types.ObjectId,
        default: () => new Types.ObjectId(),
        index: 'desc',
    })
    _id: Types.ObjectId;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
        default: Date.now,
    })
    createdAt: Date;

    @DatabaseProp({
        required: false,
        index: true,
        type: String,
    })
    createdBy?: string;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
        default: Date.now,
    })
    updatedAt: Date;

    @DatabaseProp({
        required: false,
        index: true,
        type: String,
    })
    updatedBy?: string;

    @DatabaseProp({
        type: Boolean,
        default: false,
        required: true,
        index: true,
    })
    deleted: boolean;

    @DatabaseProp({
        type: Date,
        required: false,
        index: 'asc',
    })
    deletedAt?: Date;

    @DatabaseProp({
        type: String,
        required: false,
        index: true,
    })
    deletedBy?: string;

    @DatabaseProp({
        type: Number,
        default: 0,
        required: true,
        index: true,
        description:
            'Document version for optimistic concurrency control by Mongoose',
    })
    __v: number;
}
