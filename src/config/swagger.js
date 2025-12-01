const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

// Determine server URL based on environment
const getServers = () => {
  if (config.nodeEnv === 'production') {
    return [
      {
        url: '/api',
        description: 'Production server (relative URL)',
      },
    ];
  }
  return [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
  ];
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Change Request (CR) System API',
      version: '1.0.0',
      description: `
## Sistem Pengajuan Change Request dengan Alur Approval Berjenjang

API ini menyediakan endpoint untuk:
- **Authentication**: Login, register, dan manajemen profil
- **Tickets (Change Request)**: CRUD untuk pengajuan CR
- **Approval Workflow**: Proses approval berjenjang (Manager → VP → Manager IT → Developer)
- **Notifications**: Notifikasi real-time via WebSocket
- **Dashboard**: Dashboard statistik sesuai role

### Alur Approval:
1. **USER** membuat dan submit CR
2. **MANAGER** review dan approve/reject/revision
3. **VP IT** review dan approve/reject/revision (approval manager hangus jika reject)
4. **MANAGER IT** assign ke developer
5. **DEVELOPER** eksekusi dan complete

### Role-Based Access:
| Role | Access |
|------|--------|
| USER | Create, edit, delete (draft), submit CR sendiri |
| MANAGER | Approve/reject CR dari unit sendiri |
| VP | Approve/reject semua CR yang sudah approve manager |
| MANAGER_IT | Assign developer ke CR yang sudah approve VP |
| DEV | View dan complete CR yang di-assign |
      `,
      contact: {
        name: 'API Support',
        email: 'support@company.com',
      },
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Masukkan token JWT yang didapat dari endpoint login',
        },
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['USER', 'MANAGER', 'VP', 'MANAGER_IT', 'DEV'] 
            },
            division: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user1@company.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login berhasil' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string' },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name', 'role'],
          properties: {
            email: { type: 'string', format: 'email', example: 'newuser@company.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
            name: { type: 'string', example: 'John Doe' },
            role: { 
              type: 'string', 
              enum: ['USER', 'MANAGER', 'VP', 'MANAGER_IT', 'DEV'],
              example: 'USER'
            },
            division: { type: 'string', example: 'Unit A' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['oldPassword', 'newPassword'],
          properties: {
            oldPassword: { type: 'string', minLength: 6 },
            newPassword: { type: 'string', minLength: 6 },
          },
        },

        // CR Form Data schema
        CRFormData: {
          type: 'object',
          required: [
            'targetDate', 'title', 'requester1', 'requester2', 
            'businessArea', 'categoryImpact', 'impactDescription',
            'background', 'objective', 'serviceExplanation', 'servicesNeeded'
          ],
          properties: {
            targetDate: { type: 'string', format: 'date', example: '2025-12-31' },
            title: { type: 'string', example: 'Pengembangan Fitur Login SSO' },
            requester1: { type: 'string', example: 'Ahmad User' },
            requester2: { type: 'string', example: 'Manager Unit A' },
            businessArea: { type: 'string', example: 'IT Infrastructure' },
            categoryImpact: { type: 'string', example: 'High' },
            impactDescription: { type: 'string', example: 'Meningkatkan keamanan akses sistem' },
            background: { type: 'string', example: 'Saat ini login menggunakan sistem terpisah untuk setiap aplikasi' },
            objective: { type: 'string', example: 'Menyederhanakan proses login dengan SSO' },
            serviceExplanation: { type: 'string', example: 'Implementasi Single Sign-On menggunakan OAuth 2.0' },
            servicesNeeded: { type: 'string', example: 'Development, Testing, Deployment' },
          },
        },
        CreateCRRequest: {
          type: 'object',
          required: ['formData'],
          properties: {
            formData: { $ref: '#/components/schemas/CRFormData' },
          },
        },
        ChangeRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'CR-2025-11-000001' },
            userId: { type: 'string', format: 'uuid' },
            formData: { $ref: '#/components/schemas/CRFormData' },
            status: {
              type: 'string',
              enum: [
                'DRAFT', 'PENDING_MANAGER', 'REJECTED_MANAGER', 'REVISION_MANAGER',
                'PENDING_VP', 'REJECTED_VP', 'REVISION_VP', 'APPROVED',
                'ASSIGNED_DEV', 'COMPLETED', 'DELETED'
              ],
            },
            currentApproverRole: { type: 'string', nullable: true },
            revisionCount: { type: 'integer' },
            managerRevisionCount: { type: 'integer' },
            vpRevisionCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            user: { $ref: '#/components/schemas/User' },
            approvalLogs: {
              type: 'array',
              items: { $ref: '#/components/schemas/ApprovalLog' },
            },
            documents: {
              type: 'array',
              items: { $ref: '#/components/schemas/Document' },
            },
          },
        },

        // Approval schemas
        ApprovalLog: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            crId: { type: 'string' },
            approverId: { type: 'string', format: 'uuid' },
            action: { type: 'string', enum: ['APPROVE', 'REJECT', 'REQUEST_REVISION', 'SUBMIT', 'RESUBMIT'] },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            approver: { $ref: '#/components/schemas/User' },
          },
        },
        ApproveRequest: {
          type: 'object',
          properties: {
            notes: { type: 'string', example: 'Approved. Please proceed.' },
          },
        },
        RejectRequest: {
          type: 'object',
          required: ['notes'],
          properties: {
            notes: { 
              type: 'string', 
              minLength: 50,
              example: 'Ditolak karena tidak sesuai dengan kebijakan perusahaan. Silakan buat CR baru dengan justifikasi yang lebih kuat.' 
            },
          },
        },
        RevisionRequest: {
          type: 'object',
          required: ['notes'],
          properties: {
            notes: { 
              type: 'string', 
              minLength: 50,
              example: 'Mohon perbaiki bagian latar belakang dengan menambahkan data pendukung dan statistik penggunaan sistem saat ini.' 
            },
          },
        },
        AssignDeveloperRequest: {
          type: 'object',
          required: ['developerIds'],
          properties: {
            developerIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
              example: ['dev-uuid-1', 'dev-uuid-2'],
            },
            notes: { type: 'string', example: 'Priority tinggi, deadline 2 minggu' },
          },
        },

        // Document schema
        Document: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            crId: { type: 'string' },
            fileName: { type: 'string' },
            filePath: { type: 'string' },
            fileSize: { type: 'integer' },
            mimeType: { type: 'string' },
            fileType: { type: 'string', enum: ['ATTACHMENT', 'PDF_APPROVAL'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // Notification schema
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            relatedId: { type: 'string', nullable: true },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // Progress tracking
        ProgressStep: {
          type: 'object',
          properties: {
            step: { type: 'integer' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['completed', 'current', 'pending'] },
            timestamp: { type: 'string', format: 'date-time', nullable: true },
            approver: { type: 'string', nullable: true },
          },
        },
        CRProgress: {
          type: 'object',
          properties: {
            crId: { type: 'string' },
            currentStatus: { type: 'string' },
            steps: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProgressStep' },
            },
          },
        },

        // Standard responses
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
              nullable: true,
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Token tidak valid atau tidak ada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Token tidak ditemukan',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Akses ditolak (role tidak sesuai)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Akses ditolak. Role yang diizinkan: MANAGER',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource tidak ditemukan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Change Request tidak ditemukan',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validasi gagal',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Validasi gagal',
                errors: [
                  { field: 'email', message: 'Email tidak valid' },
                ],
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & User Management' },
      { name: 'Tickets', description: 'Change Request CRUD Operations' },
      { name: 'Approval', description: 'Approval Workflow Operations' },
      { name: 'Notifications', description: 'User Notifications' },
      { name: 'Dashboard', description: 'Dashboard & Statistics' },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
