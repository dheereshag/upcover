import { Controller, Get, Post, Request, UseGuards, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@Request() req: { user: { sub: string } }) {
    return this.subscriptionService.getSubscription(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  cancelSubscription(@Request() req: { user: { sub: string } }) {
    return this.subscriptionService.cancelSubscription(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription')
  createSubscription(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.createSubscription(
      req.user.sub,
      dto.planId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/subscriptions')
  getAllSubscriptions() {
    return this.subscriptionService.getAllSubscriptions();
  }
}
