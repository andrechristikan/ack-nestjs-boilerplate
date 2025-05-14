import { DatabaseProp } from 'src/common/database/decorators/database.decorator';
import { v4 as uuidV4 } from 'uuid';

export class DatabaseEntityBase {
    @DatabaseProp({
        type: String,
        required: true,
        default: uuidV4,
    })
    _id: string;

    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    deleted: boolean;

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
    })
    createdBy?: string;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
    })
    updatedAt: Date;

    @DatabaseProp({
        required: false,
        index: true,
    })
    updatedBy?: string;

    @DatabaseProp({
        required: false,
        index: true,
        type: Date,
    })
    deletedAt?: Date;

    @DatabaseProp({
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
