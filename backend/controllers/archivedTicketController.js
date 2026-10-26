import archivedTicketService from '../services/archivedTicketService.js';

export class ArchivedTicketController {
  async list(req, res, next) {
    try {
      const result = await archivedTicketService.listArchivedTickets(req.query);
      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ticket = await archivedTicketService.getArchivedTicketById(req.params.id);
      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFilterOptions(req, res, next) {
    try {
      const options = await archivedTicketService.getFilterOptions();
      res.json({
        success: true,
        data: options,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle file upload from frontend and trigger streaming ingestion
   * Supports asynchronous background ingestion with job polling to eliminate network timeouts
   */
  async upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'Please provide a valid CSV or Excel file to upload',
          },
        });
      }

      const shouldTruncate = req.body.truncate === 'true' || req.body.truncate === true;
      const batchSize = req.body.batchSize ? parseInt(req.body.batchSize, 10) : 2000;

      // Synchronous execution if explicitly requested (e.g. CLI or automation scripts)
      if (req.query.sync === 'true') {
        const result = await archivedTicketService.ingestFile({
          filePath: req.file.path,
          originalName: req.file.originalname,
          shouldTruncate,
          batchSize,
        });

        return res.status(200).json({
          success: true,
          message: `Successfully processed ${result.totalProcessed.toLocaleString()} rows and inserted ${result.totalInserted.toLocaleString()} historical tickets into archive schema.`,
          data: result,
        });
      }

      // Default: asynchronous background ingestion with instantaneous HTTP 202 response
      const jobId = archivedTicketService.createIngestJob({
        filePath: req.file.path,
        originalName: req.file.originalname,
        shouldTruncate,
        batchSize,
      });

      res.status(202).json({
        success: true,
        jobId,
        message: 'File uploaded successfully. Processing started in background.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check status and live progress of an asynchronous upload/ingestion job
   */
  async getUploadStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const job = archivedTicketService.getJobStatus(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Ingestion job not found or expired',
          },
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Return count of archived tickets matching export filter criteria
   */
  async exportCount(req, res, next) {
    try {
      const result = await archivedTicketService.countArchivedTickets(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream download of archived tickets in CSV or Excel format
   */
  async export(req, res, next) {
    try {
      await archivedTicketService.streamExport(res, req.query);
    } catch (error) {
      next(error);
    }
  }
}

export const archivedTicketController = new ArchivedTicketController();
export default archivedTicketController;
