import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

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
        type: Number,
    })
    size: number;
}

export const AwsS3MultipartPartSchema = DatabaseSchema(
    AwsS3MultipartPartEntity
);
export type AwsS3MultipartPartDoc = IDatabaseDocument<AwsS3MultipartPartEntity>;
