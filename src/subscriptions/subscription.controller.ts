import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Body,
  Headers,
  RawBody,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('subscription')
  @ApiOperation({ summary: 'Get current user subscription' })
  getMySubscription(@Req() req: Request) {
    return this.subscriptionService.getMySubscription(req['user'].sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscription/checkout')
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  createCheckout(@Req() req: Request, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createCheckoutSession(
      req['user'].sub,
      dto.planId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscription/cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  cancelSubscription(@Req() req: Request) {
    return this.subscriptionService.cancelSubscription(req['user'].sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('subscription/all')
  @ApiOperation({ summary: 'Get all subscriptions (admin only)' })
  getAllSubscriptions() {
    return this.subscriptionService.getAllSubscriptions();
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);
    await this.subscriptionService.handleWebhookEvent(event);
    return { received: true };
  }
}
