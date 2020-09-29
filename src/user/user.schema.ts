import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as SchemaMongoose } from 'mongoose';

@Schema()
export class User extends Document {
    @Prop({
        required: true,
        index: true,
        ref: 'country'
    })
    country: SchemaMongoose.Types.ObjectId;

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

export const UserSchema = SchemaFactory.createForClass(User);
