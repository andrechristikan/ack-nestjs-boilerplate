import { Types } from 'mongoose';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';

@DatabaseEntity({ timestamps: false, _id: false })
export class AwsS3Entity {
    @DatabaseProp({
        required: true,
        type: String,
    })
    bucket: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    key: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    completedUrl: string;

    @DatabaseProp({
        required: false,
        type: String,
    })
    cdnUrl?: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    mime: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    extension: string;

    @DatabaseProp({
        required: true,
        type: Types.Decimal128,
    })
    size: Types.Decimal128;
}

export const AwsS3Schema = DatabaseSchema(AwsS3Entity);
