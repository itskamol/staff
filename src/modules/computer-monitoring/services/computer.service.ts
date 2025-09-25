import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  IComputerService,
  IComputer,
  IComputerUser,
  IDataScope,
  IUserContext
} from '../../../shared/interfaces';
import { QueryDto } from '../../../shared/dto';
import { ComputerRepository } from '../repositories/computer.repository';
import { LoggerService } from '../../../core/logger/services/logger.service';

@Injectable()
export class ComputerService implements IComputerService {
  constructor(
    private readonly computerRepository: ComputerRepository,
    private readonly logger: LoggerService,
  ) {}

  async getComputers(query: QueryDto, scope: IDataScope, user: IUserContext): Promise<IComputer[]> {
    try {
      this.logger.log('Fetching computers', {
        userId: user.id,
        scope,
        query,
      });

      const computers = await this.computerRepository.findAll(query, scope);

      this.logger.log('Successfully fetched computers', {
        count: computers.length,
        userId: user.id,
      });

      return computers;
    } catch (error) {
      this.logger.error('Failed to fetch computers', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async getComputerUsers(computerId: number, scope: IDataScope, user: IUserContext): Promise<IComputerUser[]> {
    try {
      this.logger.log('Fetching computer users', {
        computerId,
        userId: user.id,
        scope,
      });

      // Verify computer exists
      const computer = await this.computerRepository.findById(computerId);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      const users = await this.computerRepository.findUsers(computerId, scope);

      this.logger.log('Successfully fetched computer users', {
        computerId,
        userCount: users.length,
        userId: user.id,
      });

      return users;
    } catch (error) {
      this.logger.error('Failed to fetch computer users', error, {
        computerId,
        userId: user.id,
      });
      throw error;
    }
  }

  async registerComputer(computerData: Partial<IComputer>): Promise<IComputer> {
    try {
      this.logger.log('Registering new computer', {
        computerUid: computerData.computerUid,
      });

      // Validate required fields
      if (!computerData.computerUid) {
        throw new BadRequestException('Computer UID is required');
      }

      // Check if computer already exists
      const existingComputer = await this.computerRepository.findByUid(computerData.computerUid);
      if (existingComputer) {
        // Update existing computer information
        const updatedComputer = await this.computerRepository.update(existingComputer.id, {
          os: computerData.os || existingComputer.os,
          ipAddress: computerData.ipAddress || existingComputer.ipAddress,
          macAddress: computerData.macAddress || existingComputer.macAddress,
          isActive: true,
        });

        this.logger.log('Updated existing computer', {
          computerId: updatedComputer.id,
          computerUid: computerData.computerUid,
        });

        return updatedComputer;
      }

      // Create new computer
      const newComputer = await this.computerRepository.create({
        computerUid: computerData.computerUid,
        os: computerData.os,
        ipAddress: computerData.ipAddress,
        macAddress: computerData.macAddress,
        isActive: computerData.isActive ?? true,
      });

      this.logger.log('Successfully registered new computer', {
        computerId: newComputer.id,
        computerUid: computerData.computerUid,
      });

      return newComputer;
    } catch (error) {
      this.logger.error('Failed to register computer', error, {
        computerUid: computerData.computerUid,
      });
      throw error;
    }
  }

  async updateComputerStatus(computerId: number, isActive: boolean): Promise<void> {
    try {
      this.logger.log('Updating computer status', {
        computerId,
        isActive,
      });

      // Verify computer exists
      const computer = await this.computerRepository.findById(computerId);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      await this.computerRepository.update(computerId, { isActive });

      this.logger.log('Successfully updated computer status', {
        computerId,
        isActive,
      });
    } catch (error) {
      this.logger.error('Failed to update computer status', error, {
        computerId,
        isActive,
      });
      throw error;
    }
  }

  async getComputerById(id: number, scope: IDataScope, user: IUserContext): Promise<IComputer> {
    try {
      const computer = await this.computerRepository.findById(id);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      // Verify access based on scope
      await this.validateComputerAccess(computer, scope, user);

      return computer;
    } catch (error) {
      this.logger.error('Failed to get computer by ID', error, {
        computerId: id,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputerByUid(computerUid: string, scope: IDataScope, user: IUserContext): Promise<IComputer> {
    try {
      const computer = await this.computerRepository.findByUid(computerUid);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      // Verify access based on scope
      await this.validateComputerAccess(computer, scope, user);

      return computer;
    } catch (error) {
      this.logger.error('Failed to get computer by UID', error, {
        computerUid,
        userId: user.id,
      });
      throw error;
    }
  }

  async searchComputers(
    searchTerm: string,
    scope: IDataScope,
    user: IUserContext
  ): Promise<IComputer[]> {
    try {
      const query: QueryDto = {
        search: searchTerm,
        limit: 50,
      };

      return await this.computerRepository.findAll(query, scope);
    } catch (error) {
      this.logger.error('Failed to search computers', error, {
        searchTerm,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputersByOrganization(
    organizationId: number,
    user: IUserContext
  ): Promise<IComputer[]> {
    try {
      this.logger.log('Fetching computers by organization', {
        organizationId,
        userId: user.id,
      });

      const computers = await this.computerRepository.findByOrganization(organizationId);

      this.logger.log('Successfully fetched computers by organization', {
        organizationId,
        count: computers.length,
        userId: user.id,
      });

      return computers;
    } catch (error) {
      this.logger.error('Failed to fetch computers by organization', error, {
        organizationId,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputersByDepartment(
    departmentId: number,
    user: IUserContext
  ): Promise<IComputer[]> {
    try {
      this.logger.log('Fetching computers by department', {
        departmentId,
        userId: user.id,
      });

      const computers = await this.computerRepository.findByDepartment(departmentId);

      this.logger.log('Successfully fetched computers by department', {
        departmentId,
        count: computers.length,
        userId: user.id,
      });

      return computers;
    } catch (error) {
      this.logger.error('Failed to fetch computers by department', error, {
        departmentId,
        userId: user.id,
      });
      throw error;
    }
  }

  async associateUserWithComputer(
    computerId: number,
    computerUserId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    try {
      this.logger.log('Associating user with computer', {
        computerId,
        computerUserId,
        userId: user.id,
      });

      // Verify computer exists and is accessible
      const computer = await this.computerRepository.findById(computerId);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      await this.validateComputerAccess(computer, scope, user);

      // Associate user with computer
      await this.computerRepository.associateUser(computerId, computerUserId);

      this.logger.log('Successfully associated user with computer', {
        computerId,
        computerUserId,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error('Failed to associate user with computer', error, {
        computerId,
        computerUserId,
        userId: user.id,
      });
      throw error;
    }
  }

  async dissociateUserFromComputer(
    computerId: number,
    computerUserId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    try {
      this.logger.log('Dissociating user from computer', {
        computerId,
        computerUserId,
        userId: user.id,
      });

      // Verify computer exists and is accessible
      const computer = await this.computerRepository.findById(computerId);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      await this.validateComputerAccess(computer, scope, user);

      // Dissociate user from computer
      await this.computerRepository.dissociateUser(computerId, computerUserId);

      this.logger.log('Successfully dissociated user from computer', {
        computerId,
        computerUserId,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error('Failed to dissociate user from computer', error, {
        computerId,
        computerUserId,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputersWithActivity(
    startDate: Date,
    endDate: Date,
    scope: IDataScope,
    user: IUserContext
  ): Promise<IComputer[]> {
    try {
      this.logger.log('Fetching computers with activity in date range', {
        startDate,
        endDate,
        userId: user.id,
      });

      const computers = await this.computerRepository.findWithActivityInDateRange(
        startDate,
        endDate,
        scope
      );

      this.logger.log('Successfully fetched computers with activity', {
        count: computers.length,
        startDate,
        endDate,
        userId: user.id,
      });

      return computers;
    } catch (error) {
      this.logger.error('Failed to fetch computers with activity', error, {
        startDate,
        endDate,
        userId: user.id,
      });
      throw error;
    }
  }

  async updateComputerSpecifications(
    computerId: number,
    specifications: {
      os?: string;
      ipAddress?: string;
      macAddress?: string;
    },
    scope: IDataScope,
    user: IUserContext
  ): Promise<IComputer> {
    try {
      this.logger.log('Updating computer specifications', {
        computerId,
        specifications,
        userId: user.id,
      });

      // Verify computer exists and is accessible
      const computer = await this.computerRepository.findById(computerId);
      if (!computer) {
        throw new NotFoundException('Computer not found');
      }

      await this.validateComputerAccess(computer, scope, user);

      const updatedComputer = await this.computerRepository.update(computerId, specifications);

      this.logger.log('Successfully updated computer specifications', {
        computerId,
        userId: user.id,
      });

      return updatedComputer;
    } catch (error) {
      this.logger.error('Failed to update computer specifications', error, {
        computerId,
        userId: user.id,
      });
      throw error;
    }
  }

  private async validateComputerAccess(
    computer: IComputer,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    // This would implement access validation based on the computer's associated users
    // and their organizational scope. For now, we'll implement basic validation.
    
    // If scope restrictions exist, verify the computer is accessible
    if (scope.organizationId || scope.departmentId || scope.employeeIds) {
      // Check if any of the computer's users are within the scope
      // This would typically involve checking the computer's associated users
      // and their employee relationships
    }

    // Additional validation logic would be implemented here
    // based on user permissions and organizational hierarchy
  }
}