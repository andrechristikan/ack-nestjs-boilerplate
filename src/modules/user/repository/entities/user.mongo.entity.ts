import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';
import { RoleMongoEntity } from 'src/modules/role/repository/entities/role.mongo.entity';
import { UserDatabaseName } from 'src/modules/user/repository/entities/user.entity';

@DatabaseMongoSchema({ collection: UserDatabaseName })
export class UserMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 100,
    })
    username: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true,
        type: String,
        maxlength: 50,
    })
    firstName: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true,
        type: String,
        maxlength: 50,
    })
    lastName: string;

    @Prop({
        required: true,
        index: true,
        trim: true,
        unique: true,
        type: String,
        maxlength: 15,
    })
    mobileNumber: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true,
        lowercase: true,
        type: String,
        maxlength: 100,
    })
    email: string;

    @Prop({
        required: true,
        ref: RoleMongoEntity.name,
        index: true,
    })
    role: string;

    @Prop({
        required: true,
        type: String,
    })
    password: string;

    @Prop({
        required: true,
        type: String,
    })
    passwordExpired: Date;

    @Prop({
        required: true,
        type: String,
    })
    salt: string;

    @Prop({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @Prop({
        required: false,
        type: {
            path: String,
            pathWithFilename: String,
            filename: String,
            completedUrl: String,
            baseUrl: String,
            mime: String,
        },
    })
    photo?: AwsS3Serialization;
}

export const UserMongoSchema = SchemaFactory.createForClass(UserMongoEntity);

UserMongoSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.email = this.email.toLowerCase();
        this.firstName = this.firstName.toLowerCase();
        this.lastName = this.lastName.toLowerCase();

        next();
    }
);
