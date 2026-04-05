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
import { PLANS } from './plans.constant';

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
}
