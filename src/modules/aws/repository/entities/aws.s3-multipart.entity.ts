import { Types } from 'mongoose';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    AwsS3MultipartPartEntity,
    AwsS3MultipartPartSchema,
} from 'src/modules/aws/repository/entities/aws.s3-multipart-part.entity';

@DatabaseEntity({ timestamps: false, _id: false })
export class AwsS3MultipartEntity {
    @DatabaseProp({
        required: true,
        type: String,
    })
    uploadId: string;

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

    @DatabaseProp({
        required: true,
        type: Number,
    })
    lastPartNumber: number;

    @DatabaseProp({
        required: true,
        type: Number,
    })
    maxPartNumber: number;

    @DatabaseProp([AwsS3MultipartPartSchema])
    parts: AwsS3MultipartPartEntity[];
}

export const AwsS3MultipartSchema = DatabaseSchema(AwsS3MultipartEntity);
