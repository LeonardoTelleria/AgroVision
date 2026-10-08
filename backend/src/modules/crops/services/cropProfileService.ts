import prisma from "../../../shared/database/prisma";
import type { CropProfile as PersistedCropProfile } from "../../../generated/prisma/client";
import type { CropProfileResponse, CropType } from "../types/cropProfileTypes";

/** Serializa el catálogo persistido sin inventar los campos técnicos del mock. */
function toResponse(profile: PersistedCropProfile): CropProfileResponse {
  return {
    id: profile.id,
    cropType: profile.cropType,
    displayName: profile.displayName,
    mainRisks: profile.mainRisks,
    preferredMetrics: profile.preferredMetrics,
    createdAt: profile.createdAt.toISOString(),
  };
}

export class CropProfileService {
  public static async getAllProfiles(): Promise<CropProfileResponse[]> {
    const profiles = await prisma.cropProfile.findMany({ orderBy: { id: "asc" } });
    return profiles.map(toResponse);
  }

  /** Busca el tipo solicitado y, si falta, el perfil GENERAL persistido. */
  public static async getProfileByType(cropType: CropType): Promise<CropProfileResponse | null> {
    // cropType no tiene restricción unique; el ID define una elección estable.
    const profile = await prisma.cropProfile.findFirst({
      where: { cropType },
      orderBy: { id: "asc" },
    });
    if (profile) return toResponse(profile);
    if (cropType === "GENERAL") return null;

    const general = await prisma.cropProfile.findFirst({
      where: { cropType: "GENERAL" },
      orderBy: { id: "asc" },
    });
    return general ? toResponse(general) : null;
  }
}
