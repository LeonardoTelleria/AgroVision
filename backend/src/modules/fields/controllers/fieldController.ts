import { Request, Response } from "express";
import { FieldService } from "../services/fieldService";
import {
  createFieldSchema,
  updateFieldSchema,
  fieldIdParamSchema,
  farmIdParamSchema,
} from "../schemas/fieldSchemas";
import { ok, fail } from "../../../shared/responses/apiResponses";

export class FieldController {

  private fieldService = new FieldService();

  public getFields = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const fields = await this.fieldService.getFields();

      res
        .status(200)
        .json(ok(fields, "Fields loaded successfully"));
    } catch (error) {
      res
        .status(500)
        .json(fail("Failed to load fields"));
    }
  };

  public getFieldById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = fieldIdParamSchema.parse(req.params);

      const field = await this.fieldService.getFieldById(id);

      res
        .status(200)
        .json(ok(field, "Field loaded successfully"));
    } catch (error) {
      res
        .status(404)
        .json(fail("Field not found"));
    }
  };

  public getFieldsByFarmId = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { farmId } = farmIdParamSchema.parse(req.params);

      const fields =
        await this.fieldService.getFieldsByFarmId(farmId);

      res
        .status(200)
        .json(ok(fields, "Fields loaded successfully"));
    } catch (error) {
      res
        .status(400)
        .json(fail("Failed to load fields"));
    }
  };

  public createField = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const input = createFieldSchema.parse(req.body);

      const field = await this.fieldService.createField(input);

      res
        .status(201)
        .json(ok(field, "Field created successfully"));
    } catch (error) {
      res
        .status(400)
        .json(fail("Invalid field data"));
    }
  };

  public updateField = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = fieldIdParamSchema.parse(req.params);

      const input = updateFieldSchema.parse(req.body);

      const field =
        await this.fieldService.updateField(id, input);

      res
        .status(200)
        .json(ok(field, "Field updated successfully"));
    } catch (error) {
      res
        .status(400)
        .json(fail("Failed to update field"));
    }
  };
}