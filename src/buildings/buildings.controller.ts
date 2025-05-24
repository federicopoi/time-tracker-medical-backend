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
      return await this.buildingsService.getBuildingsBySiteId(parseInt(siteId));
    } catch (error) {
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
} 