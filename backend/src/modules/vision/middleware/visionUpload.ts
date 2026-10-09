/** Recepción segura y normalizada de una imagen multipart en memoria. */

import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { fail } from "../../../shared/responses/apiResponses";

export const VISION_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: VISION_MAX_IMAGE_BYTES,
    files: 1,
    fields: 4,
  },
  fileFilter: (_request, file, callback) => {
    if (!SUPPORTED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error("UNSUPPORTED_VISION_IMAGE_TYPE"));
      return;
    }

    callback(null, true);
  },
}).single("image");

/**
 * Convierte errores de Multer a ApiResponse para impedir respuestas HTML o
 * excepciones sin controlar antes de llegar al controller.
 */
export function parseVisionUpload(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  upload(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        response.status(413).json(
          fail("La imagen supera el límite permitido de 10 MB."),
        );
        return;
      }

      response.status(400).json(
        fail(`Solicitud multipart inválida: ${error.code}.`),
      );
      return;
    }

    if (
      error instanceof Error &&
      error.message === "UNSUPPORTED_VISION_IMAGE_TYPE"
    ) {
      response.status(415).json(
        fail("Formato no admitido. Utiliza una imagen JPEG, PNG o WebP."),
      );
      return;
    }

    next(error);
  });
}
