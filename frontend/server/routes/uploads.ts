import { Router, Request, Response } from "express";
import { z } from "zod";

// In-memory storage for upload views
let uploadViews = [
  {
    id: "up",
    name: "Upper Jaw",
    description: "Occlusal view of upper dental arch",
    uploading: false,
    analyzing: false,
    completed: false,
    progress: 0,
    analysisProgress: 0,
    imageUrl: null,
    analysisResults: null,
  },
  {
    id: "down",
    name: "Lower Jaw",
    description: "Occlusal view of lower dental arch",
    uploading: false,
    analyzing: false,
    completed: false,
    progress: 0,
    analysisProgress: 0,
    imageUrl: null,
    analysisResults: null,
  },
  {
    id: "left",
    name: "Left Side",
    description: "Left lateral intraoral view",
    uploading: false,
    analyzing: false,
    completed: false,
    progress: 0,
    analysisProgress: 0,
    imageUrl: null,
    analysisResults: null,
  },
  {
    id: "right",
    name: "Right Side",
    description: "Right lateral intraoral view",
    uploading: false,
    analyzing: false,
    completed: false,
    progress: 0,
    analysisProgress: 0,
    imageUrl: null,
    analysisResults: null,
  },
  {
    id: "centre",
    name: "Front View",
    description: "Anterior frontal intraoral view",
    uploading: false,
    analyzing: false,
    completed: false,
    progress: 0,
    analysisProgress: 0,
    imageUrl: null,
    analysisResults: null,
  },
];

// Module-level variables to store patient and visit IDs
let reqPatientId: string | null = null;
let reqVisitId: string | null = null;

// Validation schemas
const UploadViewSchema = z.object({
  uploading: z.boolean().optional(),
  analyzing: z.boolean().optional(),
  completed: z.boolean().optional(),
  progress: z.number().min(0).max(100).optional(),
  analysisProgress: z.number().min(0).max(100).optional(),
  imageUrl: z.string().nullable().optional(),
  analysisResults: z
    .object({
      componentsDetected: z.number(),
      confidence: z.number(),
      processingTime: z.number(),
    })
    .nullable()
    .optional(),
});

export const router = Router();

// GET /api/uploads - Get all upload views
router.get("/", (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: uploadViews,
      count: uploadViews.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch upload views",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/uploads/:viewId - Get specific upload view
router.get("/:viewId", (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const view = uploadViews.find((v) => v.id === viewId);

    if (!view) {
      return res.status(404).json({
        success: false,
        error: "Upload view not found",
      });
    }

    res.json({
      success: true,
      data: view,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch upload view",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/uploads/:viewId - Update upload view
router.put("/:viewId", (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const viewIndex = uploadViews.findIndex((v) => v.id === viewId);

    if (viewIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Upload view not found",
      });
    }

    const validationResult = UploadViewSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid upload view data",
        details: validationResult.error.errors,
      });
    }

    uploadViews[viewIndex] = {
      ...uploadViews[viewIndex],
      ...validationResult.data,
    };

    res.json({
      success: true,
      data: uploadViews[viewIndex],
      message: "Upload view updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update upload view",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/uploads/:viewId/upload - Simulate file upload
router.post("/:viewId/upload", (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const { patientId, visitId } = req.body as { patientId: string; visitId: string };
    
    // Store IDs at module level for mosaic generation
    reqPatientId = patientId;
    reqVisitId = visitId;
    
    const viewIndex = uploadViews.findIndex((v) => v.id === viewId);
    
    if (viewIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Upload view not found",
      });
    }

    // Reset and start upload simulation
    uploadViews[viewIndex] = {
      ...uploadViews[viewIndex],
      uploading: true,
      analyzing: false,
      completed: false,
      progress: 0,
      analysisProgress: 0,
      imageUrl: null,
      analysisResults: null,
    };

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      const view = uploadViews[viewIndex];
      if (view.progress < 100) {
        view.progress += Math.random() * 15 + 5; // Random progress 5-20%
        if (view.progress >= 100) {
          view.progress = 100;
          view.uploading = false;
          view.imageUrl = `/uploads/${viewId}-${Date.now()}.jpg`;
          clearInterval(uploadInterval);

          // Start analysis simulation after upload completes
          setTimeout(() => {
            startAnalysisSimulation(viewIndex);
          }, 500);
        }
      }
    }, 200);

    res.json({
      success: true,
      data: uploadViews[viewIndex],
      message: "Upload started successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to start upload",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Function to simulate analysis
async function startAnalysisSimulation(viewIndex: number) {
  const view = uploadViews[viewIndex];
  view.analyzing = true;
  view.analysisProgress = 0;

  const analysisInterval = setInterval(() => {
    if (view.analysisProgress < 100) {
      view.analysisProgress += Math.random() * 12 + 8; // Random progress 8-20%
      if (view.analysisProgress >= 100) {
        view.analysisProgress = 100;
        view.analyzing = false;
        view.completed = true;
        view.analysisResults = {
          componentsDetected: Math.floor(Math.random() * 5) + 3, // 3-7 components
          confidence: Math.floor(Math.random() * 20) + 80, // 80-100% confidence
          processingTime: Math.floor(Math.random() * 3000) + 2000, // 2-5 seconds
        };
        clearInterval(analysisInterval);
        const allDone = uploadViews.every(v => v.completed);
        
        // Use module-level variables for mosaic generation
        if (allDone && reqPatientId && reqVisitId) {
          // Using an async IIFE to handle the await calls properly
          (async () => {
            try {
              const { createMosaic } = await import("../utils/createMosaic.js");
              await createMosaic(reqPatientId, reqVisitId);
              console.log(`✓ Mosaic for ${reqPatientId}/${reqVisitId} ready`);
            } catch (err) {
              console.error("✗ Mosaic generation failed:", err);
            }
          })();
        }
      }
    }
  }, 300);
}

// POST /api/uploads/reset - Reset all upload views
router.post("/reset", (req: Request, res: Response) => {
  try {
    uploadViews = uploadViews.map((view) => ({
      ...view,
      uploading: false,
      analyzing: false,
      completed: false,
      progress: 0,
      analysisProgress: 0,
      imageUrl: null,
      analysisResults: null,
    }));

    res.json({
      success: true,
      data: uploadViews,
      message: "Upload views reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to reset upload views",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/uploads/bulk - Start bulk upload for all views
router.post("/bulk", (req: Request, res: Response) => {
  try {
    // Start upload simulation for all views
    uploadViews.forEach((view, index) => {
      setTimeout(() => {
        // Stagger uploads by 1 second each
        const req = { params: { viewId: view.id } };
        const mockRes = {
          json: () => {},
          status: () => mockRes,
        };
        // Simulate upload for each view
        router.stack
          .find((layer) => layer.route?.path === "/:viewId/upload")
          ?.route?.stack[0]?.handle(req as any, mockRes as any, () => {});
      }, index * 1000);
    });

    res.json({
      success: true,
      message: "Bulk upload started for all views",
      data: uploadViews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to start bulk upload",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/uploads/progress/overview - Get overall upload progress
router.get("/progress/overview", (req: Request, res: Response) => {
  try {
    const totalViews = uploadViews.length;
    const completedViews = uploadViews.filter((v) => v.completed).length;
    const uploadingViews = uploadViews.filter((v) => v.uploading).length;
    const analyzingViews = uploadViews.filter((v) => v.analyzing).length;
    
    const avgUploadProgress =
      uploadViews.reduce((sum, v) => sum + v.progress, 0) / totalViews;
    const avgAnalysisProgress =
      uploadViews.reduce((sum, v) => sum + v.analysisProgress, 0) / totalViews;

    res.json({
      success: true,
      data: {
        totalViews,
        completedViews,
        uploadingViews,
        analyzingViews,
        overallProgress:
          Math.round((completedViews / totalViews) * 100 * 100) / 100,
        avgUploadProgress: Math.round(avgUploadProgress * 100) / 100,
        avgAnalysisProgress: Math.round(avgAnalysisProgress * 100) / 100,
        allCompleted: completedViews === totalViews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch upload progress overview",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
