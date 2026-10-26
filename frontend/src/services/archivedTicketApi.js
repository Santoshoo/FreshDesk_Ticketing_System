import api from './api.js';

export const archivedTicketApi = {
  /**
   * Fetch paginated archived tickets with search and filters
   */
  list: async (params = {}) => {
    const res = await api.get('/archived-tickets', { params });
    return res.data;
  },

  /**
   * Fetch single archived ticket detail with complete description
   */
  getById: async (id) => {
    const res = await api.get(`/archived-tickets/${id}`);
    return res.data;
  },

  /**
   * Fetch distinct dropdown filter options (statuses, agents, groups, ticketTypes)
   */
  getFilterOptions: async () => {
    const res = await api.get('/archived-tickets/filter-options');
    return res.data;
  },

  /**
   * Check status of background ingestion job
   */
  getUploadStatus: async (jobId) => {
    const res = await api.get(`/archived-tickets/upload-status/${jobId}`);
    return res.data;
  },

  /**
   * Get count of tickets matching export criteria (for real-time preview)
   */
  getExportCount: async (params = {}) => {
    const res = await api.get('/archived-tickets/export-count', { params });
    return res.data;
  },

  /**
   * Download exported tickets (CSV or XLSX) with filters or custom date range
   */
  downloadExport: async (params = {}) => {
    const res = await api.get('/archived-tickets/export', {
      params,
      responseType: 'blob',
      timeout: 300000,
    });

    let filename = `archived_tickets_${new Date().toISOString().slice(0, 10)}.${params.format === 'xlsx' ? 'xlsx' : 'csv'}`;
    const disposition = res.headers?.['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const mimeType = params.format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv;charset=utf-8;';

    const blob = new Blob([res.data], { type: mimeType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { filename, size: res.data?.size };
  },

  /**
   * Upload legacy tickets file (.csv, .xlsx, .xls) directly from frontend
   * Uses asynchronous background job processing with live progress polling to avoid network timeouts
   */
  upload: async (file, { truncate = false, batchSize = 2000 } = {}, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('truncate', String(truncate));
    formData.append('batchSize', String(batchSize));

    // 1. Send file to server (multer receives it in a few seconds)
    const uploadRes = await api.post('/archived-tickets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            phase: 'uploading',
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: Math.min(100, percent),
          });
        }
      },
      timeout: 180000, // 3 minutes timeout for initial file upload
    });

    const { jobId } = uploadRes.data;
    if (!jobId) {
      // Synchronous response fallback
      return uploadRes.data;
    }

    // 2. Poll server for live ingestion progress every 1 second
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.get(`/archived-tickets/upload-status/${jobId}`);
          const job = statusRes.data?.data;

          if (!job) {
            clearInterval(pollInterval);
            return reject(new Error('Ingestion job status not found'));
          }

          if (onProgress) {
            onProgress({
              phase: 'processing',
              processed: job.processed,
              inserted: job.inserted,
              total: job.total,
              percent: job.percent,
            });
          }

          if (job.status === 'completed') {
            clearInterval(pollInterval);
            resolve({
              success: true,
              message: `Successfully processed ${job.processed.toLocaleString()} rows and inserted ${job.inserted.toLocaleString()} historical tickets into archive schema.`,
              data: job.result,
            });
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(job.error || 'Ingestion failed on server'));
          }
        } catch (pollErr) {
          // If a transient network glitch happens while polling, retry next tick
          console.warn('Polling status warning:', pollErr.message);
        }
      }, 1000);
    });
  },
};

export default archivedTicketApi;
