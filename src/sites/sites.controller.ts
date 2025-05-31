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
    console.log(`Updating site with ID: ${id}`, site);
    try {
      const updatedSite = await this.sitesService.updateSite(parseInt(id), site);
      if (!updatedSite) {
        console.log(`Site with ID ${id} not found`);
        throw new HttpException('Site not found', HttpStatus.NOT_FOUND);
      }
      console.log('Site updated successfully:', updatedSite);
      return updatedSite;
    } catch (error) {
      console.error('Error updating site:', error);
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

  // Optimized endpoint: Get site with all details (buildings, users, patient counts)
  @Get(':id/with-all-details')
  async getSiteWithAllDetails(@Param('id') id: string) {
    try {
      const site = await this.sitesService.getSiteWithAllDetails(parseInt(id));
      if (!site) {
        throw new HttpException('Site not found', HttpStatus.NOT_FOUND);
      }
      return site;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error in getSiteWithAllDetails controller:', error);
      throw new HttpException('Failed to fetch site with all details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get site by name with all details
  @Get('name/:siteName/with-all-details')
  async getSiteByNameWithAllDetails(@Param('siteName') siteName: string) {
    try {
      const site = await this.sitesService.getSiteByNameWithAllDetails(siteName);
      if (!site) {
        throw new HttpException('Site not found', HttpStatus.NOT_FOUND);
      }
      return site;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error in getSiteByNameWithAllDetails controller:', error);
      throw new HttpException('Failed to fetch site by name with all details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get all sites with summary statistics
  @Get('with-summary-stats/all')
  async getSitesWithSummaryStats() {
    try {
      return await this.sitesService.getSitesWithSummaryStats();
    } catch (error) {
      console.error('Error in getSitesWithSummaryStats controller:', error);
      throw new HttpException('Failed to fetch sites with summary stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 