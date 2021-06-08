import { ProductEntity } from './product.schema';
import { Document } from 'mongoose';

export type ProductDocument = ProductEntity & Document;
