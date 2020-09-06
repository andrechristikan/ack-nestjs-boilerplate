import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Country extends Document {
    @Prop({
        required: true,
        index: true,
        unique: true,
    })
    mobileNumberCode: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
    })
    countryCode: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
    })
    countryName: string;
}

export const CountrySchema = SchemaFactory.createForClass(Country);

export class CountryStoreFillableFields {
    mobileNumberCode: string;
    countryCode: string;
    countryName: string;
}

export class CountryUpdateFillableFields {
    mobileNumberCode: string;
    countryCode: string;
    countryName: string;
}
