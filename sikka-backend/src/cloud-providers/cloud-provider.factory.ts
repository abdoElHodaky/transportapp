import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudProviderInterface } from './interfaces/cloud-provider.interface';
import { AwsProviderService } from './aws/aws-provider.service';
import { LinodeProviderService } from './linode/linode-provider.service';

export type CloudProviderType = 'aws' | 'linode';

@Injectable()
export class CloudProviderFactory {
  constructor(
    private readonly awsProvider: AwsProviderService,
    private readonly linodeProvider: LinodeProviderService,
  ) {}

  /**
   * Create a cloud provider instance based on the provider type
   * @param providerType The type of cloud provider to create
   * @returns CloudProviderInterface implementation
   */
  createProvider(providerType: CloudProviderType): CloudProviderInterface {
    switch (providerType) {
      case 'aws':
        return this.awsProvider;
      case 'linode':
        return this.linodeProvider;
      default:
        throw new BadRequestException(
          `Unsupported cloud provider: ${providerType}`,
        );
    }
  }

  /**
   * Get all available cloud provider types
   * @returns Array of supported provider types
   */
  getAvailableProviders(): CloudProviderType[] {
    return ['aws', 'linode'];
  }

  /**
   * Check if a provider type is supported
   * @param providerType The provider type to check
   * @returns True if supported, false otherwise
   */
  isProviderSupported(providerType: string): providerType is CloudProviderType {
    return this.getAvailableProviders().includes(
      providerType as CloudProviderType,
    );
  }

  /**
   * Get provider instances for all supported providers
   * @returns Map of provider type to provider instance
   */
  getAllProviders(): Map<CloudProviderType, CloudProviderInterface> {
    const providers = new Map<CloudProviderType, CloudProviderInterface>();

    for (const providerType of this.getAvailableProviders()) {
      providers.set(providerType, this.createProvider(providerType));
    }

    return providers;
  }

  /**
   * Create multiple provider instances
   * @param providerTypes Array of provider types to create
   * @returns Array of provider instances
   */
  createMultipleProviders(
    providerTypes: CloudProviderType[],
  ): CloudProviderInterface[] {
    return providerTypes.map((type) => this.createProvider(type));
  }

  /**
   * Get provider instance with validation
   * @param providerType The provider type
   * @returns Validated provider instance
   */
  getValidatedProvider(providerType: string): CloudProviderInterface {
    if (!this.isProviderSupported(providerType)) {
      throw new BadRequestException(
        `Unsupported cloud provider: ${providerType}. Supported providers: ${this.getAvailableProviders().join(', ')}`,
      );
    }

    return this.createProvider(providerType);
  }
}
