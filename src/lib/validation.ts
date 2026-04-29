import { z } from "zod";

export const UNITS = ["g", "mg", "mL", "L", "pcs", "pack", "sachet"] as const;
export type Unit = (typeof UNITS)[number];

export const StoreNameSchema = z
  .string()
  .trim()
  .min(1, "Store name is required")
  .max(50, "Store name is too long");

const NameSchema = z.string().trim().min(1, "Name is required").max(100, "Name is too long");

const QuantitySchema = z.coerce
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(1_000_000, "Quantity is too large");

const AmountSchema = z.coerce
  .number()
  .positive("Amount must be greater than 0")
  .max(1_000_000, "Amount is too large");

const UnitSchema = z.enum(UNITS);

const AmountUnitPair = z
  .object({
    amount: AmountSchema.optional(),
    unit: UnitSchema.optional(),
  })
  .refine(
    (v) => (v.amount === undefined && v.unit === undefined) || (v.amount !== undefined && v.unit !== undefined),
    { message: "Amount and unit must be set together" },
  );

export const CreateItemSchema = z
  .object({
    name: NameSchema,
    quantity: QuantitySchema,
  })
  .and(AmountUnitPair);

export const UpdateItemSchema = CreateItemSchema;

export const MergeItemsSchema = z.object({
  ids: z.array(z.string().uuid()).min(2, "Select at least 2 items to merge"),
  canonicalName: NameSchema,
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type MergeItemsInput = z.infer<typeof MergeItemsSchema>;
