import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
    @Prop({
        required: true,
        index: true,
        lowercase: true,
    })
    firstName: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
    })
    lastName: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
    })
    mobileNumber: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
    })
    email: string;

    @Prop({
        required: true,
    })
    password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
