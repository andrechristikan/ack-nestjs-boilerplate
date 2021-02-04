import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const UserDatabaseName = 'user';
@Schema()
export class UserEntity extends Document {
    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true
    })
    firstName: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true
    })
    lastName: string;

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
        required: true
    })
    password: string;

    @Prop({
        required: true,
        unique: true,
        trim: true
    })
    salt: string;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
