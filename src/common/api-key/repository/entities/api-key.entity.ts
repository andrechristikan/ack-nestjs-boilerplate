import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/database.mongo-uuid-entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';

export const ApiKeyDatabaseName = 'apikeys';

@DatabaseEntity({ collection: ApiKeyDatabaseName })
export class ApiKeyEntity extends DatabaseMongoUUIDEntityAbstract {
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
        required: false,
        type: String,
        minlength: 1,
        maxlength: 255,
    })
    description?: string;

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
        type: String,
        index: true,
        trim: true,
    })
    encryptionKey: string;

    @Prop({
        required: true,
        type: String,
        trim: true,
    })
    passphrase: string;

    @Prop({
        required: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKeyEntity);

ApiKeySchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.name = this.name.toLowerCase();

        next();
    }
);
