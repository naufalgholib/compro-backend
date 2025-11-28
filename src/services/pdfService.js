const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const config = require('../config');
const { ensureDirectoryExists } = require('../utils/fileHelper');
const { formatDateID, formatDateTimeID } = require('../utils/dateHelper');
const { notFound } = require('../utils/apiError');

/**
 * Generate approval PDF document for a CR
 * @param {string} crId 
 * @returns {Promise<string>} Path to generated PDF
 */
async function generateApprovalPDF(crId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { name: true, email: true, division: true },
      },
      approvalLogs: {
        where: { action: 'APPROVE' },
        include: {
          approver: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Ensure PDF directory exists
  const pdfDir = path.join(config.upload.path, 'pdf');
  ensureDirectoryExists(pdfDir);

  const pdfPath = path.join(pdfDir, `${crId}-approval.pdf`);
  const formData = cr.formData;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('DOKUMEN PERSETUJUAN CHANGE REQUEST', { align: 'center' });
      doc.moveDown();
      
      // CR ID and Date
      doc.fontSize(12).font('Helvetica');
      doc.text(`No. CR: ${crId}`, { align: 'center' });
      doc.text(`Tanggal: ${formatDateID(new Date())}`, { align: 'center' });
      doc.moveDown(2);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Section: Informasi Pemohon
      doc.fontSize(14).font('Helvetica-Bold').text('INFORMASI PEMOHON');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Nama Pemohon: ${cr.user.name}`);
      doc.text(`Email: ${cr.user.email}`);
      doc.text(`Divisi: ${cr.user.division || '-'}`);
      doc.moveDown();

      // Section: Detail Change Request
      doc.fontSize(14).font('Helvetica-Bold').text('DETAIL CHANGE REQUEST');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Judul Proyek: ${formData.title || '-'}`);
      doc.text(`Target Tanggal Selesai: ${formData.targetDate ? formatDateID(formData.targetDate) : '-'}`);
      doc.text(`Business Area: ${formData.businessArea || '-'}`);
      doc.text(`Category Impact: ${formData.categoryImpact || '-'}`);
      doc.moveDown(0.5);
      
      doc.font('Helvetica-Bold').text('Deskripsi Impact:');
      doc.font('Helvetica').text(formData.impactDescription || '-');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Latar Belakang:');
      doc.font('Helvetica').text(formData.background || '-');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Tujuan:');
      doc.font('Helvetica').text(formData.objective || '-');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Penjelasan Layanan:');
      doc.font('Helvetica').text(formData.serviceExplanation || '-');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Layanan yang Dibutuhkan:');
      doc.font('Helvetica').text(formData.servicesNeeded || '-');
      doc.moveDown();

      // Section: Approval History
      doc.fontSize(14).font('Helvetica-Bold').text('RIWAYAT PERSETUJUAN');
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('No', 50, tableTop, { width: 30 });
      doc.text('Approver', 80, tableTop, { width: 150 });
      doc.text('Role', 230, tableTop, { width: 100 });
      doc.text('Tanggal', 330, tableTop, { width: 150 });
      
      doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke();
      doc.moveDown();

      // Table rows
      doc.fontSize(10).font('Helvetica');
      cr.approvalLogs.forEach((log, index) => {
        const y = doc.y;
        doc.text(String(index + 1), 50, y, { width: 30 });
        doc.text(log.approver.name, 80, y, { width: 150 });
        doc.text(log.approver.role, 230, y, { width: 100 });
        doc.text(formatDateTimeID(log.createdAt), 330, y, { width: 150 });
        doc.moveDown(0.5);
      });

      doc.moveDown(2);

      // Footer
      doc.fontSize(10).font('Helvetica-Oblique');
      doc.text('Dokumen ini dibuat secara otomatis oleh sistem CR.', { align: 'center' });
      doc.text(`Dicetak pada: ${formatDateTimeID(new Date())}`, { align: 'center' });

      doc.end();

      stream.on('finish', async () => {
        // Save PDF reference to database
        await prisma.document.create({
          data: {
            crId,
            fileName: `${crId}-approval.pdf`,
            filePath: pdfPath,
            fileSize: fs.statSync(pdfPath).size,
            mimeType: 'application/pdf',
            fileType: 'PDF_APPROVAL',
          },
        });
        resolve(pdfPath);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate dynamic form PDF
 * @param {string} crId 
 * @returns {Promise<string>} Path to generated PDF
 */
async function generateDynamicFormPDF(crId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { name: true, division: true },
      },
      developerAssignments: {
        include: {
          developer: { select: { name: true } },
          assignedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  const pdfDir = path.join(config.upload.path, 'pdf');
  ensureDirectoryExists(pdfDir);

  const pdfPath = path.join(pdfDir, `${crId}-form.pdf`);
  const formData = cr.formData;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('FORM IMPLEMENTASI CHANGE REQUEST', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica');
      doc.text(`No. CR: ${crId}`, { align: 'center' });
      doc.moveDown(2);

      // Assignment Info
      doc.fontSize(14).font('Helvetica-Bold').text('INFORMASI ASSIGNMENT');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      if (cr.developerAssignments.length > 0) {
        doc.text(`Assigned By: ${cr.developerAssignments[0].assignedBy.name}`);
        doc.text(`Developer(s):`);
        cr.developerAssignments.forEach((a, i) => {
          doc.text(`  ${i + 1}. ${a.developer.name}`);
        });
        if (cr.developerAssignments[0].notes) {
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').text('Notes:');
          doc.font('Helvetica').text(cr.developerAssignments[0].notes);
        }
      }
      doc.moveDown();

      // Project Details
      doc.fontSize(14).font('Helvetica-Bold').text('DETAIL PROYEK');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Judul: ${formData.title || '-'}`);
      doc.text(`Pemohon: ${cr.user.name} (${cr.user.division || '-'})`);
      doc.text(`Target Selesai: ${formData.targetDate ? formatDateID(formData.targetDate) : '-'}`);
      doc.moveDown();

      // Requirements
      doc.fontSize(14).font('Helvetica-Bold').text('REQUIREMENTS');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(formData.servicesNeeded || '-');
      doc.moveDown(2);

      // Signature boxes
      doc.fontSize(12).font('Helvetica-Bold').text('TANDA TANGAN', { align: 'center' });
      doc.moveDown();

      // Draw signature boxes
      const boxWidth = 150;
      const boxHeight = 60;
      const startY = doc.y;

      // Developer signature
      doc.rect(80, startY, boxWidth, boxHeight).stroke();
      doc.fontSize(10).text('Developer', 80, startY + boxHeight + 5, { width: boxWidth, align: 'center' });

      // Manager IT signature
      doc.rect(320, startY, boxWidth, boxHeight).stroke();
      doc.text('Manager IT', 320, startY + boxHeight + 5, { width: boxWidth, align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(pdfPath);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get PDF file path for download
 * @param {string} crId 
 * @param {string} type - 'approval' or 'form'
 * @returns {Promise<string>} File path
 */
async function getPDFPath(crId, type = 'approval') {
  const fileType = type === 'approval' ? 'PDF_APPROVAL' : 'PDF_FORM';
  
  const document = await prisma.document.findFirst({
    where: { crId, fileType },
    orderBy: { createdAt: 'desc' },
  });

  if (!document) {
    throw notFound('PDF tidak ditemukan');
  }

  return document.filePath;
}

module.exports = {
  generateApprovalPDF,
  generateDynamicFormPDF,
  getPDFPath,
};
