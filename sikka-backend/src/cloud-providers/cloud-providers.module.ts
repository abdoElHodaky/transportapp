import { Module } from '@nestjs/common';
import { CloudProviderFactory } from './cloud-provider.factory';
import { CloudProviderManagerService } from './cloud-provider-manager.service';
import { CostCalculatorService } from './cost-calculator.service';
import { CostComparisonService } from './cost-comparison.service';
import { AwsProviderService } from './aws/aws-provider.service';
import { LinodeProviderService } from './linode/linode-provider.service';
import { CloudProvidersController } from './cloud-providers.controller';
import { CloudProvidersConfig } from '../config/cloud-providers.config';
import { AwsProviderConfig } from '../config/aws-provider.config';
import { LinodeProviderConfig } from '../config/linode-provider.config';

@Module({
  controllers: [CloudProvidersController],
  providers: [
    // Configuration services
    CloudProvidersConfig,
    AwsProviderConfig,
    LinodeProviderConfig,
    
    // Provider implementations
    AwsProviderService,
    LinodeProviderService,
    
    // Core services
    CloudProviderFactory,
    CloudProviderManagerService,
    CostCalculatorService,
    CostComparisonService,
  ],
  exports: [
    // Export main services for use in other modules
    CloudProviderFactory,
    CloudProviderManagerService,
    CostCalculatorService,
    CostComparisonService,
    
    // Export provider services for direct access if needed
    AwsProviderService,
    LinodeProviderService,
    
    // Export configurations for other modules
    CloudProvidersConfig,
    AwsProviderConfig,
    LinodeProviderConfig,
  ],
})
export class CloudProvidersModule {}
