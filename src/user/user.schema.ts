import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { IAwsResponse } from 'src/aws/aws.interface';
import { RoleEntity } from 'src/role/role.schema';

@Schema({ timestamps: true, versionKey: false })
export class UserEntity {
    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true
    })
    firstName: string;

    @Prop({
        required: false,
        index: true,
        lowercase: true,
        trim: true
    })
    lastName?: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true
    })
    mobileNumber: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true
    })
    email: string;

    @Prop({
        required: true,
        type: Types.ObjectId,
        ref: RoleEntity.name
    })
    role: Types.ObjectId;

    @Prop({
        required: true
    })
    password: string;

    @Prop({
        required: true
    })
    passwordExpired: Date;

    @Prop({
        required: true
    })
    salt: string;

    @Prop({
        required: true,
        default: true
    })
    isActive: boolean;

    @Prop({
        required: false,
        _id: false,
        type: {
            path: String,
            path_with_filename: String,
            filename: String,
            completed_url: String,
            base_url: String,
            mime: String
        }
    })
    photo?: IAwsResponse;
}

export const UserDatabaseName = 'users';
export const UserSchema = SchemaFactory.createForClass(UserEntity);
