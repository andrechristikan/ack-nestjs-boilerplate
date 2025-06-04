import { Types } from 'mongoose';
import { DatabaseProp } from 'src/common/database/decorators/database.decorator';

export class DatabaseObjectIdEntityBase {
    @DatabaseProp({
        type: Types.ObjectId,
        required: true,
        default: () => new Types.ObjectId(),
    })
    _id: Types.ObjectId;

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
        type: Types.ObjectId,
    })
    createdBy?: Types.ObjectId;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
    })
    updatedAt: Date;

    @DatabaseProp({
        required: false,
        index: true,
        type: Types.ObjectId,
    })
    updatedBy?: Types.ObjectId;

    @DatabaseProp({
        required: false,
        index: true,
        type: Date,
    })
    deletedAt?: Date;

    @DatabaseProp({
        required: false,
        index: true,
        type: Types.ObjectId,
    })
    deletedBy?: Types.ObjectId;

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
