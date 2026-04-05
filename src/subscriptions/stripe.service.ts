import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface StripeEvent {
  type: string;
  data: { object: Record<string, any> };
}

export interface StripeSubscription {
  id: string;
  status: string;
  current_period_end?: number;
  customer: string | Record<string, any>;
  metadata?: Record<string, string>;
}

@Injectable()
export class StripeService {
  private readonly stripe: ReturnType<typeof Stripe> | null = null;
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    if (stripeKey) {
      this.stripe = Stripe(stripeKey);
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — Stripe features are disabled',
      );
    }
  }

  private ensureStripe(): ReturnType<typeof Stripe> {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY in .env',
      );
    }
    return this.stripe;
  }

  async createCheckoutSession(params: {
    stripePriceId: string;
    userId: string;
    planId: string;
    customerEmail: string;
  }): Promise<string> {
    const stripe = this.ensureStripe();
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: params.stripePriceId, quantity: 1 }],
      customer_email: params.customerEmail,
      success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscription/cancel`,
      metadata: {
        userId: params.userId,
        planId: params.planId,
      },
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }

    return session.url;
  }

  constructWebhookEvent(payload: Buffer, signature: string): StripeEvent {
    const stripe = this.ensureStripe();

    if (!this.webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET not set — skipping signature verification',
      );
      return JSON.parse(payload.toString()) as StripeEvent;
    }

    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  async cancelSubscription(
    stripeSubscriptionId: string,
  ): Promise<StripeSubscription> {
    const stripe = this.ensureStripe();
    return stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  async getSubscription(
    stripeSubscriptionId: string,
  ): Promise<StripeSubscription> {
    const stripe = this.ensureStripe();
    return stripe.subscriptions.retrieve(stripeSubscriptionId);
  }
}
