import { Router } from "express";
import { z } from "zod";
import prisma from "../../shared/database/prisma";
import { ok, fail } from "../../shared/responses/apiResponses";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  organization: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10).max(2000),
  consent: z.literal("true"),
});

export const demoRequestRoutes = Router();

demoRequestRoutes.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(fail("Revisa los datos e incluye la autorización de contacto."));
    return;
  }
  try {
    const { consent: _consent, ...data } = parsed.data;
    const request = await prisma.demoRequest.create({
      data: { ...data, organization: data.organization || null },
      select: { id: true },
    });
    res.status(201).json(ok({ id: request.id }, "Solicitud recibida."));
  } catch {
    res.status(503).json(fail("No se pudo guardar la solicitud. Inténtalo más tarde."));
  }
});
