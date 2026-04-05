import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PlanId } from '../plans.constant';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: PlanId })
  planId!: PlanId;

  @Prop({
    required: true,
    enum: ['active', 'canceled', 'past_due'],
    default: 'active',
  })
  status!: SubscriptionStatus;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeSubscriptionId?: string;

  @Prop()
  currentPeriodEnd?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
