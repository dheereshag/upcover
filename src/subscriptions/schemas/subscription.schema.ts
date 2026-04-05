import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PlanId } from '../plans.constant';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export type SubscriptionStatus = 'active' | 'cancelled';

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: PlanId })
  planId!: PlanId;

  @Prop({ required: true, enum: ['active', 'cancelled'], default: 'active' })
  status!: SubscriptionStatus;

  @Prop({ required: false })
  stripeSubscriptionId!: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
