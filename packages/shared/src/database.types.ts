
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "athlete_profiles": {
                  Row: {
                    "availability": NonNullable<Json>,"created_at": string,"date_of_birth": string | null,"equipment": string | null,"goals": string | null,"id": string,"injuries": string | null,"organization_id": string,"preferences": NonNullable<Json>,"training_history": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: NonNullable<Json>,"created_at"?: string,"date_of_birth"?: string | null,"equipment"?: string | null,"goals"?: string | null,"id"?: string,"injuries"?: string | null,"organization_id": string,"preferences"?: NonNullable<Json>,"training_history"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "availability"?: NonNullable<Json>,"created_at"?: string,"date_of_birth"?: string | null,"equipment"?: string | null,"goals"?: string | null,"id"?: string,"injuries"?: string | null,"organization_id"?: string,"preferences"?: NonNullable<Json>,"training_history"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "athlete_profiles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "athlete_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"organization_id": string | null,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"organization_id"?: string | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"organization_id"?: string | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_athletes": {
                  Row: {
                    "athlete_profile_id": string,"coach_user_id": string,"created_at": string,"id": string,"organization_id": string,"role": Database["public"]['Enums']["coach_assignment_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_profile_id": string,"coach_user_id": string,"created_at"?: string,"id"?: string,"organization_id": string,"role"?: Database["public"]['Enums']["coach_assignment_role"]
                  }
                  Update: {
                    "athlete_profile_id"?: string,"coach_user_id"?: string,"created_at"?: string,"id"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["coach_assignment_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_athletes_athlete_profile_id_fkey"
      columns: ["athlete_profile_id"]
isOneToOne: false
      referencedRelation: "athlete_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_athletes_coach_user_id_fkey"
      columns: ["coach_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_athletes_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"community_comments": {
                  Row: {
                    "author_id": string,"author_role": Database["public"]['Enums']["org_role"],"body": string,"created_at": string,"hidden_at": string | null,"id": string,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_role"?: Database["public"]['Enums']["org_role"],"body": string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"post_id": string
                  }
                  Update: {
                    "author_id"?: string,"author_role"?: Database["public"]['Enums']["org_role"],"body"?: string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"community_posts": {
                  Row: {
                    "author_id": string,"author_role": Database["public"]['Enums']["org_role"],"body": string,"created_at": string,"hidden_at": string | null,"hidden_by": string | null,"id": string,"organization_id": string,"pinned": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_role"?: Database["public"]['Enums']["org_role"],"body": string,"created_at"?: string,"hidden_at"?: string | null,"hidden_by"?: string | null,"id"?: string,"organization_id": string,"pinned"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"author_role"?: Database["public"]['Enums']["org_role"],"body"?: string,"created_at"?: string,"hidden_at"?: string | null,"hidden_by"?: string | null,"id"?: string,"organization_id"?: string,"pinned"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_posts_hidden_by_fkey"
      columns: ["hidden_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_posts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"community_reactions": {
                  Row: {
                    "created_at": string,"kind": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"kind"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"kind"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_reactions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_reports": {
                  Row: {
                    "comment_id": string | null,"created_at": string,"id": string,"post_id": string,"reason": string | null,"reporter_id": string,"resolved_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id"?: string | null,"created_at"?: string,"id"?: string,"post_id": string,"reason"?: string | null,"reporter_id": string,"resolved_at"?: string | null
                  }
                  Update: {
                    "comment_id"?: string | null,"created_at"?: string,"id"?: string,"post_id"?: string,"reason"?: string | null,"reporter_id"?: string,"resolved_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_reports_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "community_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_reports_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "created_at": string,"created_by": string | null,"equipment": (string)[],"id": string,"instructions": string | null,"is_archived": boolean,"is_shared": boolean,"muscle_groups": (string)[],"name": string,"organization_id": string,"owner_coach_id": string | null,"tracking": Database["public"]['Enums']["exercise_tracking"],"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"equipment"?: (string)[],"id"?: string,"instructions"?: string | null,"is_archived"?: boolean,"is_shared"?: boolean,"muscle_groups"?: (string)[],"name": string,"organization_id": string,"owner_coach_id"?: string | null,"tracking"?: Database["public"]['Enums']["exercise_tracking"],"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"equipment"?: (string)[],"id"?: string,"instructions"?: string | null,"is_archived"?: boolean,"is_shared"?: boolean,"muscle_groups"?: (string)[],"name"?: string,"organization_id"?: string,"owner_coach_id"?: string | null,"tracking"?: Database["public"]['Enums']["exercise_tracking"],"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercises_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercises_owner_coach_id_fkey"
      columns: ["owner_coach_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"coach_user_id": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"coach_user_id"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"token"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"coach_user_id"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["org_role"],"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_coach_user_id_fkey"
      columns: ["coach_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["org_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"feature_tiers_enabled": boolean,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feature_tiers_enabled"?: boolean,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"feature_tiers_enabled"?: boolean,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plan_features": {
                  Row: {
                    "feature_key": string,"plan_id": string,"usage_limit": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "feature_key": string,"plan_id": string,"usage_limit"?: number | null
                  }
                  Update: {
                    "feature_key"?: string,"plan_id"?: string,"usage_limit"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_features_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_default": boolean,"level": number,"name": string,"organization_id": string,"price_cents": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_default"?: boolean,"level": number,"name": string,"organization_id": string,"price_cents"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_default"?: boolean,"level"?: number,"name"?: string,"organization_id"?: string,"price_cents"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plans_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string | null,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string | null,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"program_blocks": {
                  Row: {
                    "id": string,"name": string,"notes": string | null,"position": number,"program_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"name"?: string,"notes"?: string | null,"position": number,"program_id": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"notes"?: string | null,"position"?: number,"program_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_blocks_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"program_sessions": {
                  Row: {
                    "day_of_week": number | null,"id": string,"name": string,"notes": string | null,"position": number,"program_id": string,"week_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day_of_week"?: number | null,"id": string,"name"?: string,"notes"?: string | null,"position": number,"program_id": string,"week_id": string
                  }
                  Update: {
                    "day_of_week"?: number | null,"id"?: string,"name"?: string,"notes"?: string | null,"position"?: number,"program_id"?: string,"week_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_sessions_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "program_sessions_week_id_fkey"
      columns: ["week_id"]
isOneToOne: false
      referencedRelation: "program_weeks"
      referencedColumns: ["id"]
    }
                  ]
                },"program_versions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"document": NonNullable<Json>,"id": string,"program_id": string,"reason": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"document": NonNullable<Json>,"id"?: string,"program_id": string,"reason"?: string | null,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"document"?: NonNullable<Json>,"id"?: string,"program_id"?: string,"reason"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "program_versions_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"program_weeks": {
                  Row: {
                    "block_id": string,"id": string,"is_deload": boolean,"notes": string | null,"position": number,"program_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"id": string,"is_deload"?: boolean,"notes"?: string | null,"position": number,"program_id": string
                  }
                  Update: {
                    "block_id"?: string,"id"?: string,"is_deload"?: boolean,"notes"?: string | null,"position"?: number,"program_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_weeks_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "program_blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "program_weeks_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"programs": {
                  Row: {
                    "athlete_profile_id": string | null,"created_at": string,"created_by": string | null,"current_version": number,"description": string | null,"id": string,"name": string,"organization_id": string,"owner_coach_id": string | null,"source_program_id": string | null,"start_date": string | null,"status": Database["public"]['Enums']["program_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_profile_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"description"?: string | null,"id"?: string,"name": string,"organization_id": string,"owner_coach_id"?: string | null,"source_program_id"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["program_status"],"updated_at"?: string
                  }
                  Update: {
                    "athlete_profile_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"description"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"owner_coach_id"?: string | null,"source_program_id"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["program_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "programs_athlete_profile_id_fkey"
      columns: ["athlete_profile_id"]
isOneToOne: false
      referencedRelation: "athlete_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_owner_coach_id_fkey"
      columns: ["owner_coach_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "programs_source_program_id_fkey"
      columns: ["source_program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"session_exercises": {
                  Row: {
                    "exercise_id": string,"id": string,"load_type": Database["public"]['Enums']["load_type"],"load_value": number | null,"notes": string | null,"position": number,"program_id": string,"reps": string | null,"rest_seconds": number | null,"rpe": number | null,"session_id": string,"sets": number | null,"superset": string | null,"tempo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"id": string,"load_type"?: Database["public"]['Enums']["load_type"],"load_value"?: number | null,"notes"?: string | null,"position": number,"program_id": string,"reps"?: string | null,"rest_seconds"?: number | null,"rpe"?: number | null,"session_id": string,"sets"?: number | null,"superset"?: string | null,"tempo"?: string | null
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"load_type"?: Database["public"]['Enums']["load_type"],"load_value"?: number | null,"notes"?: string | null,"position"?: number,"program_id"?: string,"reps"?: string | null,"rest_seconds"?: number | null,"rpe"?: number | null,"session_id"?: string,"sets"?: number | null,"superset"?: string | null,"tempo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "program_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"set_logs": {
                  Row: {
                    "completed": boolean,"distance_meters": number | null,"duration_seconds": number | null,"exercise_id": string,"id": string,"load": number | null,"load_unit": Database["public"]['Enums']["load_unit"],"notes": string | null,"position": number,"reps": number | null,"rpe": number | null,"session_exercise_id": string | null,"set_number": number,"workout_log_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed"?: boolean,"distance_meters"?: number | null,"duration_seconds"?: number | null,"exercise_id": string,"id": string,"load"?: number | null,"load_unit"?: Database["public"]['Enums']["load_unit"],"notes"?: string | null,"position": number,"reps"?: number | null,"rpe"?: number | null,"session_exercise_id"?: string | null,"set_number": number,"workout_log_id": string
                  }
                  Update: {
                    "completed"?: boolean,"distance_meters"?: number | null,"duration_seconds"?: number | null,"exercise_id"?: string,"id"?: string,"load"?: number | null,"load_unit"?: Database["public"]['Enums']["load_unit"],"notes"?: string | null,"position"?: number,"reps"?: number | null,"rpe"?: number | null,"session_exercise_id"?: string | null,"set_number"?: number,"workout_log_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "set_logs_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_session_exercise_id_fkey"
      columns: ["session_exercise_id"]
isOneToOne: false
      referencedRelation: "session_exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "set_logs_workout_log_id_fkey"
      columns: ["workout_log_id"]
isOneToOne: false
      referencedRelation: "workout_logs"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "athlete_profile_id": string,"created_at": string,"current_period_end": string | null,"external_id": string | null,"id": string,"plan_id": string,"source": Database["public"]['Enums']["subscription_source"],"status": Database["public"]['Enums']["subscription_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_profile_id": string,"created_at"?: string,"current_period_end"?: string | null,"external_id"?: string | null,"id"?: string,"plan_id": string,"source"?: Database["public"]['Enums']["subscription_source"],"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string
                  }
                  Update: {
                    "athlete_profile_id"?: string,"created_at"?: string,"current_period_end"?: string | null,"external_id"?: string | null,"id"?: string,"plan_id"?: string,"source"?: Database["public"]['Enums']["subscription_source"],"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_athlete_profile_id_fkey"
      columns: ["athlete_profile_id"]
isOneToOne: true
      referencedRelation: "athlete_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_logs": {
                  Row: {
                    "athlete_profile_id": string,"completed_at": string | null,"created_at": string,"id": string,"notes": string | null,"organization_id": string,"performed_on": string,"program_id": string | null,"rpe": number | null,"session_id": string | null,"session_name": string,"started_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_profile_id": string,"completed_at"?: string | null,"created_at"?: string,"id": string,"notes"?: string | null,"organization_id": string,"performed_on": string,"program_id"?: string | null,"rpe"?: number | null,"session_id"?: string | null,"session_name"?: string,"started_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "athlete_profile_id"?: string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"notes"?: string | null,"organization_id"?: string,"performed_on"?: string,"program_id"?: string | null,"rpe"?: number | null,"session_id"?: string | null,"session_name"?: string,"started_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_logs_athlete_profile_id_fkey"
      columns: ["athlete_profile_id"]
isOneToOne: false
      referencedRelation: "athlete_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_logs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_logs_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_logs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "program_sessions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "invite_token": string }; Returns: string
                           },
"create_organization":
{ Args: { "org_name": string }; Returns: string
                           },
"get_invitation":
{ Args: { "invite_token": string }; Returns: {
              "email": string,"invited_by_name": string,"is_accepted": boolean,"is_expired": boolean,"organization_name": string,"role": Database["public"]['Enums']["org_role"]
            }[]
                           },
"my_plan":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"save_plan_settings":
{ Args: { "document": Json,"org_id": string }; Returns: undefined
                           },
"save_program":
{ Args: { "document": Json,"expected_version": number,"reason"?: string,"target_program_id": string }; Returns: number
                           },
"save_workout":
{ Args: { "document": Json }; Returns: string
                           }
          }
          Enums: {
            "coach_assignment_role": "primary"|"nutrition"|"assistant","exercise_tracking": "weight_reps"|"reps"|"time"|"distance","load_type": "none"|"kg"|"lb"|"percent_1rm","load_unit": "kg"|"lb","org_role": "owner"|"head_coach"|"coach"|"athlete","program_status": "draft"|"active"|"completed"|"archived","subscription_source": "manual"|"stripe"|"app_store"|"play_store","subscription_status": "active"|"trialing"|"past_due"|"canceled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "coach_assignment_role": ["primary", "nutrition", "assistant"],"exercise_tracking": ["weight_reps", "reps", "time", "distance"],"load_type": ["none", "kg", "lb", "percent_1rm"],"load_unit": ["kg", "lb"],"org_role": ["owner", "head_coach", "coach", "athlete"],"program_status": ["draft", "active", "completed", "archived"],"subscription_source": ["manual", "stripe", "app_store", "play_store"],"subscription_status": ["active", "trialing", "past_due", "canceled"]
          }
        }
} as const
