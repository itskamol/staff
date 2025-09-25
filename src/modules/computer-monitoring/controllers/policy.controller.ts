import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { DataScope } from '../../../core/auth/decorators/data-scope.decorator';
import { 
  QueryDto,
  CreatePolicyDto,
  UpdatePolicyDto,
  PolicyResponseDto,
  ApiResponseDto
} from '../../../shared/dto';
import { IUserContext, IDataScope } from '../../../shared/interfaces';
import { PolicyService } from '../services/policy.service';

@ApiTags('Policies')
@ApiBearerAuth()
@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get policies list',
    description: 'Retrieve a list of monitoring policies with organizational filtering. Admin can see all, HR can see their organization.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by policy title' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({
    status: 200,
    description: 'Policies retrieved successfully',
    type: [PolicyResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can access policies' })
  async getPolicies(
    @Query() query: QueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto[]>> {
    const policies = await this.policyService.getPolicies(query, scope, user);
    
    return {
      success: true,
      data: policies,
      message: 'Policies retrieved successfully',
    };
  }

  @Get(':id')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get policy by ID',
    description: 'Retrieve detailed information about a specific monitoring policy'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy retrieved successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this policy' })
  async getPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto>> {
    const policy = await this.policyService.getPolicyById(id, scope, user);
    
    return {
      success: true,
      data: policy,
      message: 'Policy retrieved successfully',
    };
  }

  @Post()
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create new policy',
    description: 'Create a new monitoring policy with configuration options. Only Admin and HR can create policies.'
  })
  @ApiBody({ 
    type: CreatePolicyDto,
    description: 'Policy configuration data'
  })
  @ApiResponse({
    status: 201,
    description: 'Policy created successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid policy configuration' })
  @ApiResponse({ status: 409, description: 'Policy with this title already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can create policies' })
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto>> {
    const policy = await this.policyService.createPolicy(createPolicyDto, scope, user);
    
    return {
      success: true,
      data: policy,
      message: 'Policy created successfully',
    };
  }

  @Put(':id')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Update policy',
    description: 'Update an existing monitoring policy configuration. Only Admin and HR can update policies.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Policy ID' })
  @ApiBody({ 
    type: UpdatePolicyDto,
    description: 'Updated policy configuration data'
  })
  @ApiResponse({
    status: 200,
    description: 'Policy updated successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 400, description: 'Invalid policy configuration' })
  @ApiResponse({ status: 409, description: 'Policy title conflicts with existing policy' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can update policies' })
  async updatePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto>> {
    const policy = await this.policyService.updatePolicy(id, updatePolicyDto, scope, user);
    
    return {
      success: true,
      data: policy,
      message: 'Policy updated successfully',
    };
  }

  @Delete(':id')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete policy',
    description: 'Delete a monitoring policy. Only Admin and HR can delete policies. Cannot delete policies assigned to employees.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete policy - it is assigned to employees' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can delete policies' })
  async deletePolicy(
    @Param('id', ParseIntPipe) id: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.policyService.deletePolicy(id, scope, user);
    
    return {
      success: true,
      data: null,
      message: 'Policy deleted successfully',
    };
  }

  @Post(':id/assign-employees')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Assign policy to employees',
    description: 'Assign a monitoring policy to multiple employees. Only Admin and HR can assign policies.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Policy ID' })
  @ApiBody({
    description: 'Employee IDs to assign the policy to',
    schema: {
      type: 'object',
      properties: {
        employeeIds: {
          type: 'array',
          items: { type: 'number' }
        }
      },
      required: ['employeeIds']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Policy assigned to employees successfully',
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 400, description: 'Invalid employee IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can assign policies' })
  async assignPolicyToEmployees(
    @Param('id', ParseIntPipe) policyId: number,
    @Body() assignDto: { employeeIds: number[] },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.policyService.applyPolicyToEmployees(policyId, assignDto.employeeIds);
    
    return {
      success: true,
      data: null,
      message: `Policy assigned to ${assignDto.employeeIds.length} employee(s) successfully`,
    };
  }

  @Delete(':id/remove-employees')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Remove policy from employees',
    description: 'Remove a monitoring policy from multiple employees. Only Admin and HR can remove policy assignments.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Policy ID' })
  @ApiBody({
    description: 'Employee IDs to remove the policy from',
    schema: {
      type: 'object',
      properties: {
        employeeIds: {
          type: 'array',
          items: { type: 'number' }
        }
      },
      required: ['employeeIds']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Policy removed from employees successfully',
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 400, description: 'Invalid employee IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can remove policy assignments' })
  async removePolicyFromEmployees(
    @Param('id', ParseIntPipe) policyId: number,
    @Body() removeDto: { employeeIds: number[] },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.policyService.removePolicyFromEmployees(policyId, removeDto.employeeIds);
    
    return {
      success: true,
      data: null,
      message: `Policy removed from ${removeDto.employeeIds.length} employee(s) successfully`,
    };
  }

  @Get('employee/:employeeId')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get employee policies',
    description: 'Retrieve all active policies assigned to a specific employee'
  })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee policies retrieved successfully',
    type: [PolicyResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this employee' })
  async getEmployeePolicies(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto[]>> {
    const policies = await this.policyService.getEmployeePolicies(employeeId);
    
    return {
      success: true,
      data: policies,
      message: 'Employee policies retrieved successfully',
    };
  }

  @Post('validate-configuration')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Validate policy configuration',
    description: 'Validate a policy configuration without creating the policy. Useful for form validation.'
  })
  @ApiBody({ 
    type: CreatePolicyDto,
    description: 'Policy configuration to validate'
  })
  @ApiResponse({
    status: 200,
    description: 'Policy configuration is valid',
  })
  @ApiResponse({ status: 400, description: 'Invalid policy configuration with detailed error messages' })
  async validatePolicyConfiguration(
    @Body() configDto: CreatePolicyDto,
  ): Promise<ApiResponseDto<{ valid: boolean; errors?: string[] }>> {
    try {
      await this.policyService.validatePolicyConfiguration(configDto);
      
      return {
        success: true,
        data: { valid: true },
        message: 'Policy configuration is valid',
      };
    } catch (error) {
      return {
        success: false,
        data: { valid: false, errors: [error.message] },
        message: 'Policy configuration validation failed',
      };
    }
  }

  @Post(':id/duplicate')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Duplicate policy',
    description: 'Create a copy of an existing policy with a new title. Only Admin and HR can duplicate policies.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Source policy ID' })
  @ApiBody({
    description: 'New policy title',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' }
      },
      required: ['title']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Policy duplicated successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Source policy not found' })
  @ApiResponse({ status: 409, description: 'Policy with new title already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can duplicate policies' })
  async duplicatePolicy(
    @Param('id', ParseIntPipe) policyId: number,
    @Body() duplicateDto: { title: string },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto>> {
    const duplicatedPolicy = await this.policyService.duplicatePolicy(
      policyId,
      duplicateDto.title,
      scope,
      user,
    );
    
    return {
      success: true,
      data: duplicatedPolicy,
      message: 'Policy duplicated successfully',
    };
  }

  @Get('templates/list')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get policy templates',
    description: 'Retrieve predefined policy templates for quick policy creation'
  })
  @ApiResponse({
    status: 200,
    description: 'Policy templates retrieved successfully',
  })
  async getPolicyTemplates(): Promise<ApiResponseDto<any[]>> {
    const templates = [
      {
        id: 'basic-monitoring',
        name: 'Basic Monitoring',
        description: 'Standard monitoring with screenshots every 10 minutes',
        configuration: {
          activeWindow: true,
          screenshot: true,
          visitedSites: true,
          screenshotOptions: {
            interval: 600,
            isGrayscale: false,
            captureAllWindow: true,
          },
          visitedSitesOptions: {
            trackPrivateBrowsing: false,
            blockedDomains: [],
            allowedDomains: [],
          },
          activeWindowsOptions: {
            trackIdleTime: true,
            idleThreshold: 300,
            excludedProcesses: [],
          },
        },
      },
      {
        id: 'high-security',
        name: 'High Security Monitoring',
        description: 'Intensive monitoring with frequent screenshots and detailed tracking',
        configuration: {
          activeWindow: true,
          screenshot: true,
          visitedSites: true,
          screenshotOptions: {
            interval: 180,
            isGrayscale: false,
            captureAllWindow: true,
          },
          visitedSitesOptions: {
            trackPrivateBrowsing: true,
            blockedDomains: ['facebook.com', 'youtube.com', 'instagram.com'],
            allowedDomains: [],
          },
          activeWindowsOptions: {
            trackIdleTime: true,
            idleThreshold: 60,
            excludedProcesses: [],
          },
        },
      },
      {
        id: 'minimal-monitoring',
        name: 'Minimal Monitoring',
        description: 'Light monitoring focused on active windows only',
        configuration: {
          activeWindow: true,
          screenshot: false,
          visitedSites: false,
          activeWindowsOptions: {
            trackIdleTime: true,
            idleThreshold: 600,
            excludedProcesses: ['notepad.exe', 'calculator.exe'],
          },
        },
      },
    ];
    
    return {
      success: true,
      data: templates,
      message: 'Policy templates retrieved successfully',
    };
  }

  @Post('templates/:templateId/create')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create policy from template',
    description: 'Create a new policy based on a predefined template'
  })
  @ApiParam({ name: 'templateId', type: String, description: 'Template ID' })
  @ApiBody({
    description: 'Policy customization options',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        employeeIds: {
          type: 'array',
          items: { type: 'number' }
        }
      },
      required: ['title']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Policy created from template successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 400, description: 'Invalid customization options' })
  async createPolicyFromTemplate(
    @Param('templateId') templateId: string,
    @Body() customizationDto: { title: string; employeeIds?: number[] },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<PolicyResponseDto>> {
    // This would be implemented to create a policy from a template
    const templatePolicy = await this.policyService.createPolicyTemplate({
      name: customizationDto.title,
      templateId,
    });
    
    return {
      success: true,
      data: templatePolicy,
      message: 'Policy created from template successfully',
    };
  }

  @Get('statistics/overview')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get policy statistics',
    description: 'Retrieve overview statistics for policies within the user\'s scope'
  })
  @ApiResponse({
    status: 200,
    description: 'Policy statistics retrieved successfully',
  })
  async getPolicyStatistics(
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const statistics = await this.policyService.getPolicyStatistics(scope, user);
    
    return {
      success: true,
      data: statistics,
      message: 'Policy statistics retrieved successfully',
    };
  }

  @Post('bulk-assign')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Bulk assign policies to employees',
    description: 'Assign multiple policies to multiple employees in a single operation'
  })
  @ApiBody({
    description: 'Bulk assignment data',
    schema: {
      type: 'object',
      properties: {
        assignments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              policyId: { type: 'number' },
              employeeIds: {
                type: 'array',
                items: { type: 'number' }
              }
            },
            required: ['policyId', 'employeeIds']
          }
        }
      },
      required: ['assignments']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk policy assignment completed',
  })
  async bulkAssignPolicies(
    @Body() bulkAssignDto: { assignments: Array<{ policyId: number; employeeIds: number[] }> },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const assignment of bulkAssignDto.assignments) {
      try {
        await this.policyService.applyPolicyToEmployees(assignment.policyId, assignment.employeeIds);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to assign policy ${assignment.policyId}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      data: results,
      message: `Bulk assignment completed. ${results.successful} successful, ${results.failed} failed.`,
    };
  }
}