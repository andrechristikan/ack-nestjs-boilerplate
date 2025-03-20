import { Types } from 'mongoose';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';

@DatabaseEntity({ timestamps: false, _id: false })
export class AwsS3MultipartPartEntity {
    @DatabaseProp({
        required: true,
        type: String,
    })
    eTag: string;

    @DatabaseProp({
        required: true,
        type: Number,
    })
    partNumber: number;

    @DatabaseProp({
        required: true,
        type: Types.Decimal128,
    })
    size: Types.Decimal128;
}

export const AwsS3MultipartPartSchema = DatabaseSchema(
    AwsS3MultipartPartEntity
);
