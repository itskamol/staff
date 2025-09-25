import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { 
  AgentDataDto,
  RegisterComputerUserDto,
  AgentDataResponseDto,
  ComputerUserRegistrationResponseDto,
  ApiResponseDto
} from '../../../shared/dto';
import { AgentService } from '../services/agent.service';
import { ComputerUserService } from '../services/computer-user.service';

@ApiTags('Agent Data Collection')
@Controller('monitoring')
@UseGuards(ThrottlerGuard)
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly computerUserService: ComputerUserService,
  ) {}

  @Post('agent-data')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Submit agent monitoring data',
    description: 'Endpoint for C# agents to submit monitoring data (active windows, visited sites, screenshots, sessions)'
  })
  @ApiHeader({
    name: 'X-Computer-UID',
    description: 'Computer unique identifier',
    required: true,
  })
  @ApiHeader({
    name: 'X-Agent-Version',
    description: 'Agent version for compatibility checking',
    required: false,
  })
  @ApiBody({ 
    type: AgentDataDto,
    description: 'Monitoring data from the agent'
  })
  @ApiResponse({
    status: 202,
    description: 'Agent data accepted for processing',
    type: AgentDataResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data format or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid computer UID or authentication failed' })
  @ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' })
  async submitAgentData(
    @Body() agentDataDto: AgentDataDto,
    @Headers('x-computer-uid') computerUid?: string,
    @Headers('x-agent-version') agentVersion?: string,
  ): Promise<ApiResponseDto<AgentDataResponseDto>> {
    // Validate computer UID header
    if (!computerUid) {
      throw new BadRequestException('X-Computer-UID header is required');
    }

    // Verify computer UID matches the data
    if (agentDataDto.computerUid !== computerUid) {
      throw new BadRequestException('Computer UID in header does not match data');
    }

    // Authenticate agent
    await this.agentService.authenticateAgent(computerUid);

    // Process the agent data
    await this.agentService.processAgentData({
      computerUid: agentDataDto.computerUid,
      computerUserSid: agentDataDto.computerUserSid,
      dataType: agentDataDto.dataType,
      data: agentDataDto.data,
      timestamp: agentDataDto.timestamp,
    });

    const response: AgentDataResponseDto = {
      success: true,
      message: 'Data accepted for processing',
      processedAt: new Date(),
    };

    return {
      success: true,
      data: response,
      message: 'Agent data submitted successfully',
    };
  }

  @Post('register-computer-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register computer user',
    description: 'Endpoint for C# agents to register computer users when they log in'
  })
  @ApiHeader({
    name: 'X-Computer-UID',
    description: 'Computer unique identifier',
    required: true,
  })
  @ApiHeader({
    name: 'X-Agent-Version',
    description: 'Agent version for compatibility checking',
    required: false,
  })
  @ApiBody({ 
    type: RegisterComputerUserDto,
    description: 'Computer user registration data'
  })
  @ApiResponse({
    status: 201,
    description: 'Computer user registered successfully',
    type: ComputerUserRegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid computer UID or authentication failed' })
  @ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' })
  async registerComputerUser(
    @Body() registrationDto: RegisterComputerUserDto,
    @Headers('x-computer-uid') computerUid?: string,
    @Headers('x-agent-version') agentVersion?: string,
  ): Promise<ApiResponseDto<ComputerUserRegistrationResponseDto>> {
    // Validate computer UID header
    if (!computerUid) {
      throw new BadRequestException('X-Computer-UID header is required');
    }

    // Verify computer UID matches the data
    if (registrationDto.computerUid !== computerUid) {
      throw new BadRequestException('Computer UID in header does not match data');
    }

    // Authenticate agent
    await this.agentService.authenticateAgent(computerUid);

    // Check if this is a new user registration
    const existingUser = await this.computerUserService.getComputerUsers(
      { search: registrationDto.sid },
      {},
      { id: 0, role: 'system' } as any
    );

    const isNewUser = existingUser.length === 0;

    // Register the computer user
    const computerUser = await this.agentService.registerComputerUser({
      computerUid: registrationDto.computerUid,
      sid: registrationDto.sid,
      name: registrationDto.name,
      domain: registrationDto.domain,
      username: registrationDto.username,
      isAdmin: registrationDto.isAdmin,
      isInDomain: registrationDto.isInDomain,
      os: registrationDto.os,
      ipAddress: registrationDto.ipAddress,
      macAddress: registrationDto.macAddress,
    });

    const response: ComputerUserRegistrationResponseDto = {
      success: true,
      message: isNewUser ? 'New computer user registered' : 'Computer user updated',
      computerUserId: computerUser.id,
      isNewUser,
      registeredAt: new Date(),
    };

    return {
      success: true,
      data: response,
      message: 'Computer user registration completed successfully',
    };
  }

  @Get('agent-config/:computerUid')
  @ApiOperation({ 
    summary: 'Get agent configuration',
    description: 'Endpoint for C# agents to retrieve their configuration settings'
  })
  @ApiParam({ name: 'computerUid', type: String, description: 'Computer unique identifier' })
  @ApiHeader({
    name: 'X-Agent-Version',
    description: 'Agent version for compatibility checking',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Agent configuration retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid computer UID' })
  async getAgentConfiguration(
    @Param('computerUid') computerUid: string,
    @Headers('x-agent-version') agentVersion?: string,
  ): Promise<ApiResponseDto<any>> {
    // Authenticate agent
    await this.agentService.authenticateAgent(computerUid);

    // Get configuration for this computer
    const configuration = await this.agentService.getAgentConfiguration(computerUid);

    return {
      success: true,
      data: configuration,
      message: 'Agent configuration retrieved successfully',
    };
  }

  @Post('agent-heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Agent heartbeat',
    description: 'Endpoint for C# agents to send periodic heartbeat signals'
  })
  @ApiHeader({
    name: 'X-Computer-UID',
    description: 'Computer unique identifier',
    required: true,
  })
  @ApiHeader({
    name: 'X-Agent-Version',
    description: 'Agent version',
    required: false,
  })
  @ApiBody({
    description: 'Heartbeat data',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['healthy', 'warning', 'error'] },
        lastDataSubmission: { type: 'string', format: 'date-time' },
        systemInfo: {
          type: 'object',
          properties: {
            cpuUsage: { type: 'number' },
            memoryUsage: { type: 'number' },
            diskSpace: { type: 'number' },
          }
        }
      },
      required: ['timestamp', 'status']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Heartbeat received successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid computer UID' })
  async agentHeartbeat(
    @Body() heartbeatData: any,
    @Headers('x-computer-uid') computerUid?: string,
    @Headers('x-agent-version') agentVersion?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!computerUid) {
      throw new BadRequestException('X-Computer-UID header is required');
    }

    // Authenticate agent
    await this.agentService.authenticateAgent(computerUid);

    // Process heartbeat (update last seen, status, etc.)
    // This would typically update the computer's last activity timestamp
    // and store system health information

    const response = {
      received: true,
      timestamp: new Date(),
      nextHeartbeatInterval: 300, // 5 minutes
      configurationVersion: 1,
      shouldUpdateConfig: false,
    };

    return {
      success: true,
      data: response,
      message: 'Heartbeat received successfully',
    };
  }

  @Post('agent-error')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Report agent error',
    description: 'Endpoint for C# agents to report errors and exceptions'
  })
  @ApiHeader({
    name: 'X-Computer-UID',
    description: 'Computer unique identifier',
    required: true,
  })
  @ApiHeader({
    name: 'X-Agent-Version',
    description: 'Agent version',
    required: false,
  })
  @ApiBody({
    description: 'Error report data',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        errorType: { type: 'string' },
        errorMessage: { type: 'string' },
        stackTrace: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        context: { type: 'object' },
      },
      required: ['timestamp', 'errorType', 'errorMessage', 'severity']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Error report received successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid computer UID' })
  async reportAgentError(
    @Body() errorData: any,
    @Headers('x-computer-uid') computerUid?: string,
    @Headers('x-agent-version') agentVersion?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!computerUid) {
      throw new BadRequestException('X-Computer-UID header is required');
    }

    // Authenticate agent
    await this.agentService.authenticateAgent(computerUid);

    // Log the error for monitoring and debugging
    console.error('Agent Error Report:', {
      computerUid,
      agentVersion,
      ...errorData,
    });

    // This would typically be stored in a dedicated error logging system
    // and could trigger alerts for critical errors

    const response = {
      received: true,
      timestamp: new Date(),
      errorId: `ERR-${Date.now()}`,
      shouldRestart: errorData.severity === 'critical',
    };

    return {
      success: true,
      data: response,
      message: 'Error report received successfully',
    };
  }

  @Get('agent-status/:computerUid')
  @ApiOperation({ 
    summary: 'Get agent status',
    description: 'Get the current status and health of a specific agent'
  })
  @ApiParam({ name: 'computerUid', type: String, description: 'Computer unique identifier' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Agent status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentStatus(
    @Param('computerUid') computerUid: string,
  ): Promise<ApiResponseDto<any>> {
    // This would typically require authentication for admin/HR users
    // For now, we'll return basic status information

    const agentStatus = {
      computerUid,
      status: 'online', // online, offline, error
      lastHeartbeat: new Date(),
      lastDataSubmission: new Date(),
      agentVersion: '1.0.0',
      systemHealth: {
        cpuUsage: 45,
        memoryUsage: 60,
        diskSpace: 75,
      },
      dataSubmissionStats: {
        totalSubmissions: 1250,
        successfulSubmissions: 1248,
        failedSubmissions: 2,
        lastError: null,
      },
      configuration: {
        screenshotInterval: 300,
        dataSubmissionInterval: 60,
        monitoringEnabled: true,
      },
    };

    return {
      success: true,
      data: agentStatus,
      message: 'Agent status retrieved successfully',
    };
  }

  @Post('bulk-agent-data')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Submit bulk agent monitoring data',
    description: 'Endpoint for C# agents to submit multiple monitoring data entries in a single request'
  })
  @ApiHeader({
    name: 'X-Computer-UID',
    description: 'Computer unique identifier',
    required: true,
  })
  @ApiHeader({
    name: 'X-Agent-Version',
    description: 'Agent version',
    required: false,
  })
  @ApiBody({
    description: 'Array of monitoring data entries',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AgentDataDto' }
        }
      },
      required: ['data']
    }
  })
  @ApiResponse({
    status: 202,
    description: 'Bulk agent data accepted for processing',
  })
  @ApiResponse({ status: 400, description: 'Invalid data format or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid computer UID' })
  async submitBulkAgentData(
    @Body() bulkData: { data: AgentDataDto[] },
    @Headers('x-computer-uid') computerUid?: string,
    @Headers('x-agent-version') agentVersion?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!computerUid) {
      throw new BadRequestException('X-Computer-UID header is required');
    }

    // Authenticate agent
    await this.agentService.authenticateAgent(computerUid);

    // Validate bulk data
    if (!bulkData.data || !Array.isArray(bulkData.data) || bulkData.data.length === 0) {
      throw new BadRequestException('Data array is required and must not be empty');
    }

    if (bulkData.data.length > 100) {
      throw new BadRequestException('Maximum 100 data entries allowed per bulk request');
    }

    // Verify all entries belong to the same computer
    const invalidEntries = bulkData.data.filter(entry => entry.computerUid !== computerUid);
    if (invalidEntries.length > 0) {
      throw new BadRequestException('All data entries must belong to the same computer');
    }

    // Process each data entry
    const results = {
      total: bulkData.data.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < bulkData.data.length; i++) {
      try {
        await this.agentService.processAgentData({
          computerUid: bulkData.data[i].computerUid,
          computerUserSid: bulkData.data[i].computerUserSid,
          dataType: bulkData.data[i].dataType,
          data: bulkData.data[i].data,
          timestamp: bulkData.data[i].timestamp,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Entry ${i}: ${error.message}`);
      }
    }

    return {
      success: true,
      data: results,
      message: `Bulk data processing completed. ${results.successful}/${results.total} entries processed successfully.`,
    };
  }
}