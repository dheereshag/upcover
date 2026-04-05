import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { StripeEvent, StripeSubscription } from './stripe.service';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';
import { PlanId, PLANS, Plan } from './plans.constant';
import { StripeService } from './stripe.service';
import { UsersService } from '../users/users.service';

interface StripeCheckoutSession {
  metadata?: Record<string, string>;
  subscription?: string;
  customer?: string;
}

interface StripeInvoice {
  subscription?: string;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly stripeService: StripeService,
    private readonly usersService: UsersService,
  ) {}

  getPlans(): Plan[] {
    return PLANS;
  }

  getPlanById(planId: PlanId): Plan {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new NotFoundException(`Plan "${planId}" not found`);
    }
    return plan;
  }

  async getMySubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    return subscription;
  }

  async getAllSubscriptions(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel.find().sort({ createdAt: -1 }).exec();
  }

  async createCheckoutSession(
    userId: string,
    planId: PlanId,
  ): Promise<{ url: string }> {
    const plan = this.getPlanById(planId);

    const existing = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (existing) {
      throw new BadRequestException('User already has an active subscription');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const url = await this.stripeService.createCheckoutSession({
      stripePriceId: plan.stripePriceId,
      userId,
      planId: plan.id,
      customerEmail: user.email,
    });

    return { url };
  }

  async cancelSubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.stripeSubscriptionId) {
      try {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to cancel Stripe subscription ${subscription.stripeSubscriptionId}: ${err}`,
        );
      }
    }

    subscription.status = 'canceled';
    return subscription.save();
  }

  async handleWebhookEvent(event: StripeEvent): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as StripeCheckoutSession,
        );
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(
          event.data.object as StripeInvoice,
        );
        break;
      case 'customer.subscription.created':
        this.handleSubscriptionCreated(event.data.object as StripeSubscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as StripeSubscription,
        );
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(
    session: StripeCheckoutSession,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId as PlanId;

    if (!userId || !planId) {
      this.logger.error('Missing metadata in checkout session');
      return;
    }

    const existing = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (existing) {
      this.logger.warn(`User ${userId} already has an active subscription`);
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    const stripeCustomerId = session.customer as string;
    let currentPeriodEnd: Date | undefined;

    if (stripeSubscriptionId) {
      try {
        const stripeSub =
          await this.stripeService.getSubscription(stripeSubscriptionId);
        if (stripeSub.current_period_end) {
          currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch subscription ${stripeSubscriptionId} from Stripe: ${err}`,
        );
      }
    }

    const subscription = new this.subscriptionModel({
      userId: new Types.ObjectId(userId),
      planId,
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd,
    });

    await subscription.save();
    this.logger.log(`Subscription created for user ${userId}`);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: StripeInvoice,
  ): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const subscription = await this.subscriptionModel
      .findOne({ stripeSubscriptionId })
      .exec();

    if (!subscription) return;

    try {
      const stripeSub =
        await this.stripeService.getSubscription(stripeSubscriptionId);
      subscription.status = 'active';
      if (stripeSub.current_period_end) {
        subscription.currentPeriodEnd = new Date(
          stripeSub.current_period_end * 1000,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch subscription ${stripeSubscriptionId} from Stripe: ${err}`,
      );
      subscription.status = 'active';
    }
    await subscription.save();
  }

  private handleSubscriptionCreated(stripeSub: StripeSubscription): void {
    this.logger.log(
      `Stripe subscription created: ${stripeSub.id} — handled via checkout.session.completed`,
    );
  }

  private async handleSubscriptionDeleted(
    stripeSub: StripeSubscription,
  ): Promise<void> {
    const subscription = await this.subscriptionModel
      .findOne({ stripeSubscriptionId: stripeSub.id })
      .exec();

    if (!subscription) {
      this.logger.warn(`No DB subscription found for ${stripeSub.id}`);
      return;
    }

    subscription.status = 'canceled';
    await subscription.save();
    this.logger.log(`Subscription canceled for ${stripeSub.id}`);
  }
}
