export interface Doctor {
  id: string;
  name: string;
  crm: string;
  crm_uf: string;
  specialties: string[];
  bio_short: string | null;
  photo_url: string | null;
  email: string;
  calcom_event_type_slug: string | null;
  calcom_event_type_id: number | null;
  global_priority: number;
  handles_minors: boolean;
  handles_elderly: boolean;
  is_active: boolean;
  medical_specialty: string | null;
}
