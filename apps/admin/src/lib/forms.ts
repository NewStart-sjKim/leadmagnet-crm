import { db, forms, campaigns, eq, and } from "@leadmagnet/db";
import { ApiError } from "./api";

/** 운영자 소유 폼 조회. 다른 운영자의 폼은 404 (존재 여부 비노출). */
export async function findOwnedForm(id: string, operatorId: string) {
  const [row] = await db
    .select({ form: forms })
    .from(forms)
    .innerJoin(campaigns, eq(campaigns.id, forms.campaignId))
    .where(and(eq(forms.id, id), eq(campaigns.operatorId, operatorId)))
    .limit(1);
  if (!row) throw new ApiError(404, "폼을 찾을 수 없습니다");
  return row.form;
}
