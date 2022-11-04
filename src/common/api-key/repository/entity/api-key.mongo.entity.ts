import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';

@DatabaseMongoSchema()
export class ApiKeyMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        type: String,
        minlength: 1,
        maxlength: 100,
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
    })
    key: string;

    @Prop({
        required: true,
        type: String,
    })
    hash: string;

    @Prop({
        required: true,
        type: String,
        index: true,
    })
    encryptionKey: string;

    @Prop({
        required: true,
        type: String,
        minLength: 16,
        maxLength: 16,
    })
    passphrase: string;

    @Prop({
        required: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;
}

export const ApiKeyMongoSchema =
    SchemaFactory.createForClass(ApiKeyMongoEntity);

ApiKeyMongoSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.name = this.name.toLowerCase().trim();
        this.key = this.key.trim();
        this.hash = this.hash.trim();
        this.encryptionKey = this.encryptionKey.trim();
        this.passphrase = this.passphrase.trim();

        next();
    }
);
