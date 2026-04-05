import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';
import { PlanId, PLANS } from './plans.constant';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  getPlans() {
    return PLANS;
  }

  async getSubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    return subscription;
  }

  async cancelSubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    subscription.status = 'cancelled';
    return subscription.save();
  }

  async createSubscription(
    userId: string,
    planId: PlanId,
  ): Promise<SubscriptionDocument> {
    const existing = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (existing) {
      throw new BadRequestException('User already has an active subscription');
    }

    const subscription = new this.subscriptionModel({
      userId: new Types.ObjectId(userId),
      planId,
      status: 'active',
    });

    return subscription.save();
  }

  async getAllSubscriptions(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel.find().exec();
  }
}
