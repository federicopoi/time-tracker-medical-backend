import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SitesService, Site } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  async createSite(@Body() site: Site) {
    try {
      return await this.sitesService.createSite(site);
    } catch (error) {
      throw new HttpException('Failed to create site', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getSites() {
    try {
      return await this.sitesService.getSites();
    } catch (error) {
      throw new HttpException('Failed to fetch sites', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getSiteById(@Param('id') id: string) {
    try {
      const site = await this.sitesService.getSiteById(parseInt(id));
      if (!site) {
        throw new HttpException('Site not found', HttpStatus.NOT_FOUND);
      }
      return site;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch site', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateSite(@Param('id') id: string, @Body() site: Partial<Site>) {
    try {
      const updatedSite = await this.sitesService.updateSite(parseInt(id), site);
      if (!updatedSite) {
        throw new HttpException('Site not found', HttpStatus.NOT_FOUND);
      }
      return updatedSite;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update site', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteSite(@Param('id') id: string) {
    try {
      await this.sitesService.deleteSite(parseInt(id));
      return { message: 'Site deleted successfully' };
    } catch (error) {
      throw new HttpException('Failed to delete site', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 