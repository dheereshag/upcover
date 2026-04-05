import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, StripeService, JwtAuthGuard, RolesGuard],
})
export class SubscriptionModule {}
