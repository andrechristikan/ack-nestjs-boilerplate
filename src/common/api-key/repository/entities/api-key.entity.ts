import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { Document } from 'mongoose';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';

export const ApiKeyDatabaseName = 'apikeys';

@DatabaseEntity({ collection: ApiKeyDatabaseName })
export class ApiKeyEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        enum: ENUM_API_KEY_TYPE,
        index: true,
        trim: true,
    })
    type: ENUM_API_KEY_TYPE;

    @Prop({
        required: true,
        index: true,
        type: String,
        minlength: 1,
        maxlength: 100,
        lowercase: true,
        trim: true,
    })
    name: string;

    @Prop({
        required: true,
        type: String,
        unique: true,
        index: true,
        trim: true,
    })
    key: string;

    @Prop({
        required: true,
        trim: true,
        type: String,
    })
    hash: string;

    @Prop({
        required: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @Prop({
        required: false,
        type: Date,
    })
    startDate?: Date;

    @Prop({
        required: false,
        type: Date,
    })
    endDate?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKeyEntity);

export type ApiKeyDoc = ApiKeyEntity & Document<string>;

ApiKeySchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.name = this.name.toLowerCase();

        next();
    }
);
