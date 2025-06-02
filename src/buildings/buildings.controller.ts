import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { Building, CreateBuildingDto, UpdateBuildingDto } from './building.interface';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  async createBuilding(@Body() building: CreateBuildingDto) {
    try {
      return await this.buildingsService.createBuilding(building);
    } catch (error) {
      throw new HttpException('Failed to create building', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getBuildings() {
    try {
      return await this.buildingsService.getBuildings();
    } catch (error) {
      throw new HttpException('Failed to fetch buildings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('site/:siteId')
  async getBuildingsBySiteId(@Param('siteId') siteId: string) {
    try {
      const parsedSiteId = parseInt(siteId);
      if (isNaN(parsedSiteId)) {
        throw new HttpException('Invalid site ID provided', HttpStatus.BAD_REQUEST);
      }
      return await this.buildingsService.getBuildingsBySiteId(parsedSiteId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch buildings for site', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getBuildingById(@Param('id') id: string) {
    try {
      const building = await this.buildingsService.getBuildingById(parseInt(id));
      if (!building) {
        throw new HttpException('Building not found', HttpStatus.NOT_FOUND);
      }
      return building;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch building', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateBuilding(@Param('id') id: string, @Body() building: UpdateBuildingDto) {
    try {
      const updatedBuilding = await this.buildingsService.updateBuilding(parseInt(id), building);
      if (!updatedBuilding) {
        throw new HttpException('Building not found', HttpStatus.NOT_FOUND);
      }
      return updatedBuilding;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update building', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteBuilding(@Param('id') id: string) {
    try {
      await this.buildingsService.deleteBuilding(parseInt(id));
      return { message: 'Building deleted successfully' };
    } catch (error) {
      throw new HttpException('Failed to delete building', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get all buildings with site information
  @Get('with-site-info/all')
  async getBuildingsWithSiteInfo() {
    try {
      return await this.buildingsService.getBuildingsWithSiteInfo();
    } catch (error) {
      console.error('Error in getBuildingsWithSiteInfo controller:', error);
      throw new HttpException('Failed to fetch buildings with site info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get buildings by site with site information
  @Get('site/:siteId/with-site-info')
  async getBuildingsBySiteWithSiteInfo(@Param('siteId') siteId: string) {
    try {
      return await this.buildingsService.getBuildingsWithSiteInfo(parseInt(siteId));
    } catch (error) {
      console.error('Error in getBuildingsBySiteWithSiteInfo controller:', error);
      throw new HttpException('Failed to fetch buildings by site with site info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get building by ID with site information
  @Get(':id/with-site-info')
  async getBuildingByIdWithSiteInfo(@Param('id') id: string) {
    try {
      const building = await this.buildingsService.getBuildingByIdWithSiteInfo(parseInt(id));
      if (!building) {
        throw new HttpException('Building not found', HttpStatus.NOT_FOUND);
      }
      return building;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error in getBuildingByIdWithSiteInfo controller:', error);
      throw new HttpException('Failed to fetch building with site info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get buildings by site with patient counts
  @Get('site/:siteId/with-counts')
  async getBuildingsBySiteWithCounts(@Param('siteId') siteId: string) {
    try {
      return await this.buildingsService.getBuildingsBySiteWithCounts(parseInt(siteId));
    } catch (error) {
      console.error('Error in getBuildingsBySiteWithCounts controller:', error);
      throw new HttpException('Failed to fetch buildings by site with counts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 