export type ProfileRole = "employee" | "manager" | "admin";
export type AbsenceStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
};

export type AbsenceType = {
  id: number;
  name: string;
  color: string;
  sort_order: number;
};

export type AbsenceRow = {
  id: string;
  user_id: string;
  type_id: number;
  start_date: string;
  end_date: string;
  comment: string | null;
  status: AbsenceStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export type AbsenceWithMeta = AbsenceRow & {
  type: AbsenceType | null;
  employee: Pick<Profile, "full_name" | "id"> | null;
};
