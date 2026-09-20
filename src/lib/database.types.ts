export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
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
      availability: {
        Row: {
          id: string
          reason: string | null
          rower_id: string
          session_id: string
          status: Database["public"]["Enums"]["availability_status"]
        }
        Insert: {
          id?: string
          reason?: string | null
          rower_id: string
          session_id: string
          status: Database["public"]["Enums"]["availability_status"]
        }
        Update: {
          id?: string
          reason?: string | null
          rower_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_rower_id_fkey"
            columns: ["rower_id"]
            isOneToOne: false
            referencedRelation: "rowers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_config: {
        Row: {
          boat_number: number
          id: string
          lineup_id: string
          name: string | null
          rigging: Json | null
          workout_notes: string | null
        }
        Insert: {
          boat_number: number
          id?: string
          lineup_id: string
          name?: string | null
          rigging?: Json | null
          workout_notes?: string | null
        }
        Update: {
          boat_number?: number
          id?: string
          lineup_id?: string
          name?: string | null
          rigging?: Json | null
          workout_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_config_lineup_id_fkey"
            columns: ["lineup_id"]
            isOneToOne: false
            referencedRelation: "lineups"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      lineup_changes: {
        Row: {
          change: Json
          coach_id: string | null
          created_at: string
          id: string
          lineup_id: string
        }
        Insert: {
          change: Json
          coach_id?: string | null
          created_at?: string
          id?: string
          lineup_id: string
        }
        Update: {
          change?: Json
          coach_id?: string | null
          created_at?: string
          id?: string
          lineup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineup_changes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineup_changes_lineup_id_fkey"
            columns: ["lineup_id"]
            isOneToOne: false
            referencedRelation: "lineups"
            referencedColumns: ["id"]
          },
        ]
      }
      lineups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          position: number
          session_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          position?: number
          session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          position?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rowers: {
        Row: {
          active: boolean
          can_steer: boolean
          class_year: number | null
          created_at: string
          id: string
          is_coxswain: boolean
          name: string
          side: Database["public"]["Enums"]["rigging_side"]
          squad: string | null
          weight_kg: number | null
        }
        Insert: {
          active?: boolean
          can_steer?: boolean
          class_year?: number | null
          created_at?: string
          id?: string
          is_coxswain?: boolean
          name: string
          side?: Database["public"]["Enums"]["rigging_side"]
          squad?: string | null
          weight_kg?: number | null
        }
        Update: {
          active?: boolean
          can_steer?: boolean
          class_year?: number | null
          created_at?: string
          id?: string
          is_coxswain?: boolean
          name?: string
          side?: Database["public"]["Enums"]["rigging_side"]
          squad?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      seat_assignments: {
        Row: {
          boat_number: number
          id: string
          lineup_id: string
          rower_id: string
          seat: Database["public"]["Enums"]["seat_name"]
        }
        Insert: {
          boat_number: number
          id?: string
          lineup_id: string
          rower_id: string
          seat: Database["public"]["Enums"]["seat_name"]
        }
        Update: {
          boat_number?: number
          id?: string
          lineup_id?: string
          rower_id?: string
          seat?: Database["public"]["Enums"]["seat_name"]
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_lineup_id_fkey"
            columns: ["lineup_id"]
            isOneToOne: false
            referencedRelation: "lineups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_rower_id_fkey"
            columns: ["rower_id"]
            isOneToOne: false
            referencedRelation: "rowers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          body: string
          coach_id: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          body: string
          coach_id: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          coach_id?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          session_date: string
          slot: Database["public"]["Enums"]["session_slot"]
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          session_date: string
          slot: Database["public"]["Enums"]["session_slot"]
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          session_date?: string
          slot?: Database["public"]["Enums"]["session_slot"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_seat: {
        Args: {
          p_boat: number
          p_lineup_id: string
          p_rower_id: string
          p_seat: Database["public"]["Enums"]["seat_name"]
        }
        Returns: undefined
      }
      clone_lineup: {
        Args: { new_name: string; source_lineup_id: string }
        Returns: string
      }
      is_coach: { Args: never; Returns: boolean }
      set_primary_lineup: {
        Args: { target_lineup_id: string }
        Returns: undefined
      }
      unassign_seat: {
        Args: { p_lineup_id: string; p_rower_id: string }
        Returns: undefined
      }
    }
    Enums: {
      availability_status: "out" | "limited"
      rigging_side: "port" | "starboard" | "both"
      seat_name: "bow" | "2" | "3" | "4" | "5" | "6" | "7" | "stroke" | "cox"
      session_slot: "AM" | "PM"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      availability_status: ["out", "limited"],
      rigging_side: ["port", "starboard", "both"],
      seat_name: ["bow", "2", "3", "4", "5", "6", "7", "stroke", "cox"],
      session_slot: ["AM", "PM"],
    },
  },
} as const

