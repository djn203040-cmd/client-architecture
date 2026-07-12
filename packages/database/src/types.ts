export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  private: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_draft_atomic: {
        Args: { p_actor: string; p_draft_id: string }
        Returns: {
          new_status: Database["public"]["Enums"]["draft_status"]
          ok: boolean
          reason: string
        }[]
      }
      consume_review_token: {
        Args: {
          p_action: string
          p_coach_id: string
          p_draft_id: string
          p_token_id: string
        }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      delete_calendar_tokens: {
        Args: {
          p_coach_id: string
          p_provider: Database["public"]["Enums"]["integration_provider"]
        }
        Returns: boolean
      }
      delete_voice_corpus: { Args: { p_coach_id: string }; Returns: undefined }
      get_calendar_tokens: {
        Args: {
          p_coach_id: string
          p_provider: Database["public"]["Enums"]["integration_provider"]
        }
        Returns: Json
      }
      get_calendar_webhook_secret: {
        Args: {
          p_coach_id: string
          p_provider: Database["public"]["Enums"]["integration_provider"]
        }
        Returns: string
      }
      get_gmail_tokens: { Args: { p_coach_id: string }; Returns: Json }
      get_slack_token: { Args: { p_coach_id: string }; Returns: string }
      get_voice_corpus: { Args: { p_coach_id: string }; Returns: Json }
      hold_draft_atomic: {
        Args: { p_actor: string; p_draft_id: string }
        Returns: {
          new_status: Database["public"]["Enums"]["draft_status"]
          ok: boolean
          reason: string
        }[]
      }
      increment_followup_count: {
        Args: { p_draft_id: string }
        Returns: number
      }
      record_call_outcome_atomic: {
        Args: {
          p_actor: string
          p_id: string
          p_outcome: Database["public"]["Enums"]["call_outcome_value"]
        }
        Returns: {
          new_status: Database["public"]["Enums"]["call_outcome_status"]
          ok: boolean
          reason: string
        }[]
      }
      store_calendar_tokens: {
        Args: {
          p_coach_id: string
          p_provider: Database["public"]["Enums"]["integration_provider"]
          p_tokens: Json
        }
        Returns: string
      }
      store_calendar_webhook_secret: {
        Args: {
          p_coach_id: string
          p_provider: Database["public"]["Enums"]["integration_provider"]
          p_secret: string
        }
        Returns: string
      }
      store_gmail_tokens: {
        Args: { p_coach_id: string; p_tokens: Json }
        Returns: string
      }
      store_slack_token: {
        Args: { p_coach_id: string; p_token: string }
        Returns: string
      }
      store_voice_corpus: {
        Args: { p_coach_id: string; p_corpus: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          coach_id: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          coach_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          coach_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          coach_id: string
          event_type: string
          external_event_id: string
          id: string
          lead_id: string | null
          payload: Json | null
          processed_at: string
          provider: Database["public"]["Enums"]["integration_provider"]
        }
        Insert: {
          coach_id: string
          event_type: string
          external_event_id: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          processed_at?: string
          provider: Database["public"]["Enums"]["integration_provider"]
        }
        Update: {
          coach_id?: string
          event_type?: string
          external_event_id?: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          processed_at?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      call_outcomes: {
        Row: {
          calendar_event_id: string | null
          coach_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_via: string | null
          ends_at: string | null
          external_event_id: string
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome_value"] | null
          prompted_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          reminder_sent_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["call_outcome_status"]
          status_locked_at: string | null
          updated_at: string
        }
        Insert: {
          calendar_event_id?: string | null
          coach_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_via?: string | null
          ends_at?: string | null
          external_event_id: string
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome_value"] | null
          prompted_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["call_outcome_status"]
          status_locked_at?: string | null
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string | null
          coach_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_via?: string | null
          ends_at?: string | null
          external_event_id?: string
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome_value"] | null
          prompted_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["call_outcome_status"]
          status_locked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_outcomes_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_outcomes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_outcomes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          active_calendar_provider:
            | Database["public"]["Enums"]["integration_provider"]
            | null
          autonomous_mode: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          email_signature: string | null
          id: string
          name: string
          notification_settings: Json
          onboarding_completed_at: string | null
          onboarding_progress: Json
          public_booking_url: string | null
          role: string
          role_title: string | null
          sales_toolkit: Json
          sequence_config: Json | null
          service_info: Json | null
          timezone: string | null
          updated_at: string
          voice_model: Json | null
          working_hours: Json
        }
        Insert: {
          active_calendar_provider?:
            | Database["public"]["Enums"]["integration_provider"]
            | null
          autonomous_mode?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          email_signature?: string | null
          id: string
          name: string
          notification_settings?: Json
          onboarding_completed_at?: string | null
          onboarding_progress?: Json
          public_booking_url?: string | null
          role?: string
          role_title?: string | null
          sales_toolkit?: Json
          sequence_config?: Json | null
          service_info?: Json | null
          timezone?: string | null
          updated_at?: string
          voice_model?: Json | null
          working_hours?: Json
        }
        Update: {
          active_calendar_provider?:
            | Database["public"]["Enums"]["integration_provider"]
            | null
          autonomous_mode?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_signature?: string | null
          id?: string
          name?: string
          notification_settings?: Json
          onboarding_completed_at?: string | null
          onboarding_progress?: Json
          public_booking_url?: string | null
          role?: string
          role_title?: string | null
          sales_toolkit?: Json
          sequence_config?: Json | null
          service_info?: Json | null
          timezone?: string | null
          updated_at?: string
          voice_model?: Json | null
          working_hours?: Json
        }
        Relationships: []
      }
      consumed_tokens: {
        Row: {
          action: string
          coach_id: string
          consumed_at: string
          draft_id: string | null
          token_id: string
        }
        Insert: {
          action: string
          coach_id: string
          consumed_at?: string
          draft_id?: string | null
          token_id: string
        }
        Update: {
          action?: string
          coach_id?: string
          consumed_at?: string
          draft_id?: string | null
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumed_tokens_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumed_tokens_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_edits: {
        Row: {
          coach_id: string
          created_at: string
          draft_id: string
          edit_summary: string | null
          edited_body: string
          id: string
          original_body: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          draft_id: string
          edit_summary?: string | null
          edited_body: string
          id?: string
          original_body: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          draft_id?: string
          edit_summary?: string | null
          edited_body?: string
          id?: string
          original_body?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_edits_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          ai_model: string | null
          approved_at: string | null
          body: string
          coach_id: string
          confidence_level: string | null
          created_at: string
          followup_count: number
          generation_context: Json | null
          held_at: string | null
          id: string
          lead_id: string
          review_token_nonce: string | null
          scheduled_send_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: Database["public"]["Enums"]["draft_status"]
          status_locked_at: string | null
          subject: string | null
          total_touchpoints: number | null
          touchpoint_index: number
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          approved_at?: string | null
          body: string
          coach_id: string
          confidence_level?: string | null
          created_at?: string
          followup_count?: number
          generation_context?: Json | null
          held_at?: string | null
          id?: string
          lead_id: string
          review_token_nonce?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          status_locked_at?: string | null
          subject?: string | null
          total_touchpoints?: number | null
          touchpoint_index?: number
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          approved_at?: string | null
          body?: string
          coach_id?: string
          confidence_level?: string | null
          created_at?: string
          followup_count?: number
          generation_context?: Json | null
          held_at?: string | null
          id?: string
          lead_id?: string
          review_token_nonce?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          status_locked_at?: string | null
          subject?: string | null
          total_touchpoints?: number | null
          touchpoint_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          coach_id: string
          created_at: string
          draft_id: string | null
          event_type: string
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          lead_id: string
          open_source: string | null
          raw_payload: Json | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          draft_id?: string | null
          event_type: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          lead_id: string
          open_source?: string | null
          raw_payload?: Json | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          draft_id?: string | null
          event_type?: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          lead_id?: string
          open_source?: string | null
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          coach_id: string
          created_at: string
          error_message: string | null
          external_account_id: string | null
          id: string
          last_checked_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["integration_provider"]
          scopes: string[] | null
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          vault_secret_id: string | null
          watch_expiry_at: string | null
          webhook_secret_vault_id: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          error_message?: string | null
          external_account_id?: string | null
          id?: string
          last_checked_at?: string | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["integration_provider"]
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          vault_secret_id?: string | null
          watch_expiry_at?: string | null
          webhook_secret_vault_id?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          error_message?: string | null
          external_account_id?: string | null
          id?: string
          last_checked_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          vault_secret_id?: string | null
          watch_expiry_at?: string | null
          webhook_secret_vault_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          coach_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id: string
          lead_id: string
          payload: Json | null
          triggered_by: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          lead_id: string
          payload?: Json | null
          triggered_by?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          lead_id?: string
          payload?: Json | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_summary: string | null
          ai_summary_protected: boolean
          bounced: boolean
          coach_id: string
          coach_notes: string | null
          created_at: string
          do_not_contact: boolean
          email: string | null
          external_ids: Json | null
          id: string
          last_activity_at: string | null
          name: string
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_protected?: boolean
          bounced?: boolean
          coach_id: string
          coach_notes?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          external_ids?: Json | null
          id?: string
          last_activity_at?: string | null
          name: string
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_protected?: boolean
          bounced?: boolean
          coach_id?: string
          coach_notes?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          external_ids?: Json | null
          id?: string
          last_activity_at?: string | null
          name?: string
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          coach_id: string
          created_at: string
          draft_id: string | null
          error_message: string | null
          external_id: string | null
          id: string
          payload: Json | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          coach_id: string
          created_at?: string
          draft_id?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          coach_id?: string
          created_at?: string
          draft_id?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          coach_id: string
          created_at: string
          enabled: boolean
          event_type: string
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          coach_id: string
          created_at?: string
          enabled?: boolean
          event_type: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          coach_id?: string
          created_at?: string
          enabled?: boolean
          event_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          coach_id: string
          created_at: string
          dismissed_at: string | null
          id: string
          lead_id: string | null
          payload: Json | null
          type: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          type: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_actions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          coach_id: string
          created_at: string
          current_touchpoint: number | null
          id: string
          inngest_run_id: string | null
          lead_id: string
          module: number
          scheduled_steps: Json | null
          status: Database["public"]["Enums"]["sequence_status"]
          track: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          current_touchpoint?: number | null
          id?: string
          inngest_run_id?: string | null
          lead_id: string
          module?: number
          scheduled_steps?: Json | null
          status?: Database["public"]["Enums"]["sequence_status"]
          track?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          current_touchpoint?: number | null
          id?: string
          inngest_run_id?: string | null
          lead_id?: string
          module?: number
          scheduled_steps?: Json | null
          status?: Database["public"]["Enums"]["sequence_status"]
          track?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          call_at: string | null
          coach_id: string
          content: string
          created_at: string
          duration_seconds: number | null
          external_id: string | null
          id: string
          lead_id: string | null
          matched_by: string | null
          provider: string
          token_count: number | null
        }
        Insert: {
          call_at?: string | null
          coach_id: string
          content: string
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          matched_by?: string | null
          provider: string
          token_count?: number | null
        }
        Update: {
          call_at?: string | null
          coach_id?: string
          content?: string
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          matched_by?: string | null
          provider?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          external_event_id: string
          id: number
          payload_hash: string | null
          received_at: string
          source: string
        }
        Insert: {
          external_event_id: string
          id?: never
          payload_hash?: string | null
          received_at?: string
          source: string
        }
        Update: {
          external_event_id?: string
          id?: never
          payload_hash?: string | null
          received_at?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_draft_atomic: {
        Args: { p_actor: string; p_draft_id: string }
        Returns: {
          new_status: Database["public"]["Enums"]["draft_status"]
          ok: boolean
          reason: string
        }[]
      }
      consume_review_token: {
        Args: {
          p_action: string
          p_coach_id: string
          p_draft_id: string
          p_token_id: string
        }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      hold_draft_atomic: {
        Args: { p_actor: string; p_draft_id: string }
        Returns: {
          new_status: Database["public"]["Enums"]["draft_status"]
          ok: boolean
          reason: string
        }[]
      }
      increment_followup_count: {
        Args: { p_draft_id: string }
        Returns: number
      }
      record_call_outcome_atomic: {
        Args: {
          p_actor: string
          p_id: string
          p_outcome: Database["public"]["Enums"]["call_outcome_value"]
        }
        Returns: {
          new_status: Database["public"]["Enums"]["call_outcome_status"]
          ok: boolean
          reason: string
        }[]
      }
      store_slack_token: {
        Args: { p_coach_id: string; p_token: string }
        Returns: string
      }
    }
    Enums: {
      call_outcome_status:
        | "scheduled"
        | "awaiting_outcome"
        | "resolved"
        | "cancelled"
      call_outcome_value: "no_show" | "completed" | "converted"
      draft_status:
        | "pending"
        | "approved"
        | "edited"
        | "sent"
        | "held"
        | "cancelled"
        | "generating"
        | "error"
      integration_provider:
        | "gmail"
        | "calendly"
        | "cal_com"
        | "acuity"
        | "setmore"
        | "square"
        | "ms_bookings"
        | "tidycal"
        | "slack"
        | "twilio"
        | "instagram"
        | "zoom"
        | "fireflies"
      integration_status: "connected" | "disconnected" | "error"
      lead_event_type:
        | "call_booked"
        | "no_show"
        | "call_completed"
        | "email_sent"
        | "email_opened"
        | "replied"
        | "draft_approved"
        | "draft_held"
        | "state_changed"
        | "unsubscribed"
        | "bounced"
        | "note_added"
        | "sequence_started"
        | "sequence_paused"
        | "sequence_resumed"
        | "sequence_completed"
        | "sequence_cancelled"
        | "manually_enrolled"
        | "call_converted"
      lead_source:
        | "calendly"
        | "cal_com"
        | "acuity"
        | "setmore"
        | "square"
        | "ms_bookings"
        | "tidycal"
        | "manual"
        | "gmail_detected"
        | "instagram_detected"
        | "referral"
      lead_status:
        | "identified"
        | "call_booked"
        | "no_show"
        | "call_completed"
        | "in_sequence"
        | "replied"
        | "converted"
        | "lost"
        | "unsubscribed"
        | "do_not_contact"
        | "bounced"
      notification_channel: "email" | "slack" | "whatsapp" | "sms" | "dashboard"
      sequence_status: "active" | "paused" | "completed" | "cancelled" | "held"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  private: {
    Enums: {},
  },
  public: {
    Enums: {
      call_outcome_status: [
        "scheduled",
        "awaiting_outcome",
        "resolved",
        "cancelled",
      ],
      call_outcome_value: ["no_show", "completed", "converted"],
      draft_status: [
        "pending",
        "approved",
        "edited",
        "sent",
        "held",
        "cancelled",
        "generating",
        "error",
      ],
      integration_provider: [
        "gmail",
        "calendly",
        "cal_com",
        "acuity",
        "setmore",
        "square",
        "ms_bookings",
        "tidycal",
        "slack",
        "twilio",
        "instagram",
        "zoom",
        "fireflies",
      ],
      integration_status: ["connected", "disconnected", "error"],
      lead_event_type: [
        "call_booked",
        "no_show",
        "call_completed",
        "email_sent",
        "email_opened",
        "replied",
        "draft_approved",
        "draft_held",
        "state_changed",
        "unsubscribed",
        "bounced",
        "note_added",
        "sequence_started",
        "sequence_paused",
        "sequence_resumed",
        "sequence_completed",
        "sequence_cancelled",
        "manually_enrolled",
        "call_converted",
      ],
      lead_source: [
        "calendly",
        "cal_com",
        "acuity",
        "setmore",
        "square",
        "ms_bookings",
        "tidycal",
        "manual",
        "gmail_detected",
        "instagram_detected",
        "referral",
      ],
      lead_status: [
        "identified",
        "call_booked",
        "no_show",
        "call_completed",
        "in_sequence",
        "replied",
        "converted",
        "lost",
        "unsubscribed",
        "do_not_contact",
        "bounced",
      ],
      notification_channel: ["email", "slack", "whatsapp", "sms", "dashboard"],
      sequence_status: ["active", "paused", "completed", "cancelled", "held"],
    },
  },
} as const
