import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { 
  IPolicyService,
  IPolicy,
  IDataScope,
  IUserContext
} from '../../../shared/interfaces';
import { QueryDto, CreatePolicyDto, UpdatePolicyDto } from '../../../shared/dto';
import { PolicyRepository } from '../repositories/policy.repository';
import { LoggerService } from '../../../core/logger/services/logger.service';

@Injectable()
export class PolicyService implements IPolicyService {
  constructor(
    private readonly policyRepository: PolicyRepository,
    private readonly logger: LoggerService,
  ) {}

  async getPolicies(query: QueryDto, scope: IDataScope, user: IUserContext): Promise<IPolicy[]> {
    try {
      this.logger.log('Fetching policies', {
        userId: user.id,
        scope,
        query,
      });

      const policies = await this.policyRepository.findAll(query, scope);

      this.logger.log('Successfully fetched policies', {
        count: policies.length,
        userId: user.id,
      });

      return policies;
    } catch (error) {
      this.logger.error('Failed to fetch policies', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async createPolicy(dto: CreatePolicyDto, scope: IDataScope, user: IUserContext): Promise<IPolicy> {
    try {
      this.logger.log('Creating new policy', {
        title: dto.title,
        userId: user.id,
      });

      // Validate policy configuration
      await this.validatePolicyConfiguration(dto);

      // Check for policy conflicts
      await this.checkPolicyConflicts(dto, scope);

      // Create policy with options
      const policy = await this.policyRepository.createWithOptions(
        {
          title: dto.title,
          activeWindow: dto.activeWindow,
          screenshot: dto.screenshot,
          visitedSites: dto.visitedSites,
          isActive: true,
        },
        dto.screenshotOptions,
        dto.visitedSitesOptions,
        dto.activeWindowsOptions
      );

      // Assign to employees if specified
      if (dto.employeeIds && dto.employeeIds.length > 0) {
        await this.applyPolicyToEmployees(policy.id, dto.employeeIds);
      }

      this.logger.log('Successfully created policy', {
        policyId: policy.id,
        title: dto.title,
        userId: user.id,
      });

      return policy;
    } catch (error) {
      this.logger.error('Failed to create policy', error, {
        title: dto.title,
        userId: user.id,
      });
      throw error;
    }
  }

  async updatePolicy(id: number, dto: UpdatePolicyDto, scope: IDataScope, user: IUserContext): Promise<IPolicy> {
    try {
      this.logger.log('Updating policy', {
        policyId: id,
        userId: user.id,
      });

      // Verify policy exists and is accessible
      const existingPolicy = await this.policyRepository.findById(id);
      if (!existingPolicy) {
        throw new NotFoundException('Policy not found');
      }

      await this.validatePolicyAccess(existingPolicy, scope, user);

      // Validate updated configuration
      await this.validatePolicyConfiguration(dto);

      // Check for conflicts with updated data
      await this.checkPolicyConflicts(dto, scope, id);

      // Update policy with options
      const updatedPolicy = await this.policyRepository.updateWithOptions(
        id,
        {
          title: dto.title,
          activeWindow: dto.activeWindow,
          screenshot: dto.screenshot,
          visitedSites: dto.visitedSites,
          isActive: dto.isActive,
        },
        dto.screenshotOptions,
        dto.visitedSitesOptions,
        dto.activeWindowsOptions
      );

      this.logger.log('Successfully updated policy', {
        policyId: id,
        userId: user.id,
      });

      return updatedPolicy;
    } catch (error) {
      this.logger.error('Failed to update policy', error, {
        policyId: id,
        userId: user.id,
      });
      throw error;
    }
  }

  async deletePolicy(id: number, scope: IDataScope, user: IUserContext): Promise<void> {
    try {
      this.logger.log('Deleting policy', {
        policyId: id,
        userId: user.id,
      });

      // Verify policy exists and is accessible
      const policy = await this.policyRepository.findById(id);
      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      await this.validatePolicyAccess(policy, scope, user);

      // Check dependencies before deletion
      const dependencies = await this.policyRepository.checkDependencies(id);
      if (dependencies.hasEmployees) {
        throw new ConflictException(
          `Cannot delete policy. It is currently assigned to ${dependencies.employeeCount} employee(s). ` +
          'Please unassign all employees before deleting the policy.'
        );
      }

      // Delete policy (this will also delete related options)
      await this.policyRepository.delete(id);

      this.logger.log('Successfully deleted policy', {
        policyId: id,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error('Failed to delete policy', error, {
        policyId: id,
        userId: user.id,
      });
      throw error;
    }
  }

  async validatePolicyConfiguration(config: any): Promise<boolean> {
    try {
      // Validate basic policy structure
      if (!config.title || typeof config.title !== 'string' || config.title.trim().length === 0) {
        throw new BadRequestException('Policy title is required and must be a non-empty string');
      }

      if (config.title.length > 255) {
        throw new BadRequestException('Policy title must not exceed 255 characters');
      }

      // At least one monitoring type must be enabled
      if (!config.activeWindow && !config.screenshot && !config.visitedSites) {
        throw new BadRequestException('At least one monitoring type (activeWindow, screenshot, or visitedSites) must be enabled');
      }

      // Validate screenshot options if screenshot monitoring is enabled
      if (config.screenshot && config.screenshotOptions) {
        await this.validateScreenshotOptions(config.screenshotOptions);
      }

      // Validate visited sites options if website monitoring is enabled
      if (config.visitedSites && config.visitedSitesOptions) {
        await this.validateVisitedSitesOptions(config.visitedSitesOptions);
      }

      // Validate active windows options if window monitoring is enabled
      if (config.activeWindow && config.activeWindowsOptions) {
        await this.validateActiveWindowsOptions(config.activeWindowsOptions);
      }

      // Validate employee assignments
      if (config.employeeIds && Array.isArray(config.employeeIds)) {
        if (config.employeeIds.length > 1000) {
          throw new BadRequestException('Cannot assign policy to more than 1000 employees at once');
        }

        // Check for duplicate employee IDs
        const uniqueEmployeeIds = [...new Set(config.employeeIds)];
        if (uniqueEmployeeIds.length !== config.employeeIds.length) {
          throw new BadRequestException('Duplicate employee IDs found in assignment list');
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Policy configuration validation failed', error, {
        title: config.title,
      });
      throw error;
    }
  }

  async applyPolicyToEmployees(policyId: number, employeeIds: number[]): Promise<void> {
    try {
      this.logger.log('Applying policy to employees', {
        policyId,
        employeeCount: employeeIds.length,
      });

      // Validate policy exists
      const policy = await this.policyRepository.findById(policyId);
      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      // Validate employee IDs (this would typically involve checking if employees exist)
      await this.validateEmployeeIds(employeeIds);

      // Apply policy to employees
      await this.policyRepository.assignToEmployees(policyId, employeeIds);

      this.logger.log('Successfully applied policy to employees', {
        policyId,
        employeeCount: employeeIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to apply policy to employees', error, {
        policyId,
        employeeCount: employeeIds?.length || 0,
      });
      throw error;
    }
  }

  async removePolicyFromEmployees(policyId: number, employeeIds: number[]): Promise<void> {
    try {
      this.logger.log('Removing policy from employees', {
        policyId,
        employeeCount: employeeIds.length,
      });

      // Validate policy exists
      const policy = await this.policyRepository.findById(policyId);
      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      // Remove policy from employees
      await this.policyRepository.removeFromEmployees(policyId, employeeIds);

      this.logger.log('Successfully removed policy from employees', {
        policyId,
        employeeCount: employeeIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to remove policy from employees', error, {
        policyId,
        employeeCount: employeeIds?.length || 0,
      });
      throw error;
    }
  }

  async getPolicyById(id: number, scope: IDataScope, user: IUserContext): Promise<IPolicy> {
    try {
      const policy = await this.policyRepository.findById(id);
      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      await this.validatePolicyAccess(policy, scope, user);

      return policy;
    } catch (error) {
      this.logger.error('Failed to get policy by ID', error, {
        policyId: id,
        userId: user.id,
      });
      throw error;
    }
  }

  async getEmployeePolicies(employeeId: number): Promise<IPolicy[]> {
    try {
      this.logger.log('Fetching employee policies', { employeeId });

      const policies = await this.policyRepository.findEmployeePolicies(employeeId);

      this.logger.log('Successfully fetched employee policies', {
        employeeId,
        policyCount: policies.length,
      });

      return policies;
    } catch (error) {
      this.logger.error('Failed to fetch employee policies', error, { employeeId });
      throw error;
    }
  }

  async createPolicyTemplate(templateData: any): Promise<IPolicy> {
    try {
      this.logger.log('Creating policy template', {
        templateName: templateData.name,
      });

      // Create a template policy with predefined configurations
      const templatePolicy = await this.policyRepository.createWithOptions(
        {
          title: `Template: ${templateData.name}`,
          activeWindow: templateData.includeActiveWindow || true,
          screenshot: templateData.includeScreenshot || true,
          visitedSites: templateData.includeVisitedSites || true,
          isActive: false, // Templates are inactive by default
        },
        templateData.screenshotOptions || this.getDefaultScreenshotOptions(),
        templateData.visitedSitesOptions || this.getDefaultVisitedSitesOptions(),
        templateData.activeWindowsOptions || this.getDefaultActiveWindowsOptions()
      );

      this.logger.log('Successfully created policy template', {
        templateId: templatePolicy.id,
        templateName: templateData.name,
      });

      return templatePolicy;
    } catch (error) {
      this.logger.error('Failed to create policy template', error, {
        templateName: templateData.name,
      });
      throw error;
    }
  }

  private async validateScreenshotOptions(options: any): Promise<void> {
    if (typeof options.interval !== 'number' || options.interval < 30 || options.interval > 3600) {
      throw new BadRequestException('Screenshot interval must be between 30 and 3600 seconds');
    }

    if (typeof options.isGrayscale !== 'boolean') {
      throw new BadRequestException('isGrayscale must be a boolean value');
    }

    if (typeof options.captureAllWindow !== 'boolean') {
      throw new BadRequestException('captureAllWindow must be a boolean value');
    }
  }

  private async validateVisitedSitesOptions(options: any): Promise<void> {
    if (options.blockedDomains && !Array.isArray(options.blockedDomains)) {
      throw new BadRequestException('blockedDomains must be an array');
    }

    if (options.allowedDomains && !Array.isArray(options.allowedDomains)) {
      throw new BadRequestException('allowedDomains must be an array');
    }

    if (typeof options.trackPrivateBrowsing !== 'boolean') {
      throw new BadRequestException('trackPrivateBrowsing must be a boolean value');
    }

    // Validate domain formats
    if (options.blockedDomains) {
      for (const domain of options.blockedDomains) {
        if (typeof domain !== 'string' || !this.isValidDomain(domain)) {
          throw new BadRequestException(`Invalid domain format: ${domain}`);
        }
      }
    }

    if (options.allowedDomains) {
      for (const domain of options.allowedDomains) {
        if (typeof domain !== 'string' || !this.isValidDomain(domain)) {
          throw new BadRequestException(`Invalid domain format: ${domain}`);
        }
      }
    }
  }

  private async validateActiveWindowsOptions(options: any): Promise<void> {
    if (options.excludedProcesses && !Array.isArray(options.excludedProcesses)) {
      throw new BadRequestException('excludedProcesses must be an array');
    }

    if (typeof options.trackIdleTime !== 'boolean') {
      throw new BadRequestException('trackIdleTime must be a boolean value');
    }

    if (typeof options.idleThreshold !== 'number' || options.idleThreshold < 1 || options.idleThreshold > 300) {
      throw new BadRequestException('idleThreshold must be between 1 and 300 seconds');
    }

    // Validate process names
    if (options.excludedProcesses) {
      for (const process of options.excludedProcesses) {
        if (typeof process !== 'string' || process.trim().length === 0) {
          throw new BadRequestException('Process names must be non-empty strings');
        }
      }
    }
  }

  private async checkPolicyConflicts(config: any, scope: IDataScope, excludePolicyId?: number): Promise<void> {
    // Check for policies with the same title in the same scope
    const existingPolicies = await this.policyRepository.findAll({ search: config.title }, scope);
    
    const conflictingPolicies = existingPolicies.filter(policy => 
      policy.title.toLowerCase() === config.title.toLowerCase() &&
      (excludePolicyId ? policy.id !== excludePolicyId : true)
    );

    if (conflictingPolicies.length > 0) {
      throw new ConflictException(`A policy with the title "${config.title}" already exists`);
    }

    // Additional conflict checks can be added here
    // For example, checking for overlapping employee assignments with conflicting settings
  }

  private async validateEmployeeIds(employeeIds: number[]): Promise<void> {
    // This would typically involve checking if all employee IDs exist and are accessible
    // For now, we'll do basic validation
    for (const employeeId of employeeIds) {
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        throw new BadRequestException(`Invalid employee ID: ${employeeId}`);
      }
    }
  }

  private async validatePolicyAccess(policy: IPolicy, scope: IDataScope, user: IUserContext): Promise<void> {
    // This would implement access validation based on organizational scope
    // For now, we'll implement basic validation
    if (scope.organizationId && user.role === 'hr') {
      // HR users can only access policies within their organization
      // This would require checking the policy's organizational scope
    }
  }

  private isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  private getDefaultScreenshotOptions(): any {
    return {
      interval: 300, // 5 minutes
      isGrayscale: false,
      captureAllWindow: true,
    };
  }

  private getDefaultVisitedSitesOptions(): any {
    return {
      blockedDomains: [],
      allowedDomains: [],
      trackPrivateBrowsing: false,
    };
  }

  private getDefaultActiveWindowsOptions(): any {
    return {
      excludedProcesses: [],
      trackIdleTime: true,
      idleThreshold: 60, // 1 minute
    };
  }

  async duplicatePolicy(policyId: number, newTitle: string, scope: IDataScope, user: IUserContext): Promise<IPolicy> {
    try {
      this.logger.log('Duplicating policy', {
        sourcePolicyId: policyId,
        newTitle,
        userId: user.id,
      });

      // Get source policy
      const sourcePolicy = await this.policyRepository.findById(policyId);
      if (!sourcePolicy) {
        throw new NotFoundException('Source policy not found');
      }

      await this.validatePolicyAccess(sourcePolicy, scope, user);

      // Create duplicate policy
      const duplicatePolicy = await this.policyRepository.createWithOptions(
        {
          title: newTitle,
          activeWindow: sourcePolicy.activeWindow,
          screenshot: sourcePolicy.screenshot,
          visitedSites: sourcePolicy.visitedSites,
          isActive: false, // Duplicates are inactive by default
        },
        sourcePolicy.screenshotOptions,
        sourcePolicy.visitedSitesOptions,
        sourcePolicy.activeWindowsOptions
      );

      this.logger.log('Successfully duplicated policy', {
        sourcePolicyId: policyId,
        duplicatePolicyId: duplicatePolicy.id,
        userId: user.id,
      });

      return duplicatePolicy;
    } catch (error) {
      this.logger.error('Failed to duplicate policy', error, {
        sourcePolicyId: policyId,
        newTitle,
        userId: user.id,
      });
      throw error;
    }
  }

  async getPolicyStatistics(scope: IDataScope, user: IUserContext): Promise<any> {
    try {
      const totalPolicies = await this.policyRepository.count(scope);
      const activePolicies = await this.policyRepository.countActive(scope);

      return {
        totalPolicies,
        activePolicies,
        inactivePolicies: totalPolicies - activePolicies,
        utilizationRate: totalPolicies > 0 ? Math.round((activePolicies / totalPolicies) * 100) : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get policy statistics', error, {
        userId: user.id,
      });
      throw error;
    }
  }
}