import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';

export const UserDatabaseName = 'users';

@DatabaseEntity({ collection: UserDatabaseName })
export class UserEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 50,
    })
    firstName: string;

    @Prop({
        required: true,
        index: true,
        trim: true,
        type: String,
        maxlength: 50,
    })
    lastName: string;

    @Prop({
        required: true,
        trim: true,
        index: true,
        unique: true,
        type: String,
        maxlength: 20,
        minlength: 8,
    })
    mobileNumber: string;

    @Prop({
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true,
        type: String,
        maxlength: 100,
    })
    email: string;

    @Prop({
        required: true,
        ref: RoleEntity.name,
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
        type: Date,
    })
    passwordExpired: Date;

    @Prop({
        required: true,
        type: Date,
    })
    passwordCreated: Date;

    @Prop({
        required: true,
        default: 0,
        type: Number,
    })
    passwordAttempt: number;

    @Prop({
        required: true,
        type: Date,
    })
    signUpDate: Date;

    @Prop({
        required: true,
        enum: ENUM_USER_SIGN_UP_FROM,
    })
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @Prop({
        required: true,
        type: String,
    })
    salt: string;

    @Prop({
        required: true,
        default: ENUM_USER_STATUS.ACTIVE,
        index: true,
        type: String,
        enum: ENUM_USER_STATUS,
    })
    status: ENUM_USER_STATUS;

    @Prop({
        required: true,
        default: false,
        index: true,
        type: Boolean,
    })
    blocked: boolean;

    @Prop({
        required: false,
        _id: false,
        type: {
            path: String,
            pathWithFilename: String,
            filename: String,
            completedUrl: String,
            baseUrl: String,
            mime: String,
            size: Number,
            duration: {
                required: false,
                type: Number,
            },
        },
    })
    photo?: AwsS3Dto;

    @Prop({
        required: false,
        maxlength: 200,
    })
    address?: string;

    @Prop({
        required: false,
        enum: ENUM_USER_GENDER,
    })
    gender?: ENUM_USER_GENDER;

    @Prop({
        required: false,
    })
    selfDeletion?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);

export type UserDoc = UserEntity & Document;
