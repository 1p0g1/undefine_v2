export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          clue_status: Json
          created_at: string | null
          end_time: string | null
          guesses: string[] | null
          guesses_used: number | null
          id: string
          is_complete: boolean | null
          is_won: boolean | null
          player_id: string | null
          revealed_clues: string[] | null
          start_time: string
          state: string | null
          updated_at: string | null
          word_id: string | null
        }
        Insert: {
          clue_status?: Json
          created_at?: string | null
          end_time?: string | null
          guesses?: string[] | null
          guesses_used?: number | null
          id?: string
          is_complete?: boolean | null
          is_won?: boolean | null
          player_id?: string | null
          revealed_clues?: string[] | null
          start_time: string
          state?: string | null
          updated_at?: string | null
          word_id?: string | null
        }
        Update: {
          clue_status?: Json
          created_at?: string | null
          end_time?: string | null
          guesses?: string[] | null
          guesses_used?: number | null
          id?: string
          is_complete?: boolean | null
          is_won?: boolean | null
          player_id?: string | null
          revealed_clues?: string[] | null
          start_time?: string
          state?: string | null
          updated_at?: string | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_sessions_word"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_word_id"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_summary: {
        Row: {
          best_time: number | null
          date: string | null
          guesses_used: number | null
          id: string
          player_id: string
          rank: number | null
          was_top_10: boolean | null
          word_id: string | null
        }
        Insert: {
          best_time?: number | null
          date?: string | null
          guesses_used?: number | null
          id?: string
          player_id: string
          rank?: number | null
          was_top_10?: boolean | null
          word_id?: string | null
        }
        Update: {
          best_time?: number | null
          date?: string | null
          guesses_used?: number | null
          id?: string
          player_id?: string
          rank?: number | null
          was_top_10?: boolean | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leaderboard_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "fk_leaderboard_word"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          is_anonymous: boolean | null
          last_active: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          is_anonymous?: boolean | null
          last_active?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_anonymous?: boolean | null
          last_active?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          applied_at: string | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          version: string
        }
        Update: {
          applied_at?: string | null
          version?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          base_score: number
          completion_time_seconds: number | null
          correct: boolean
          game_session_id: string | null
          guess_penalty: number
          guesses_used: number | null
          hint_penalty: number
          id: string
          nickname: string | null
          player_id: string
          score: number
          submitted_at: string | null
          time_penalty: number
          used_hint: boolean | null
          word_id: string | null
        }
        Insert: {
          base_score?: number
          completion_time_seconds?: number | null
          correct?: boolean
          game_session_id?: string | null
          guess_penalty?: number
          guesses_used?: number | null
          hint_penalty?: number
          id?: string
          nickname?: string | null
          player_id: string
          score?: number
          submitted_at?: string | null
          time_penalty?: number
          used_hint?: boolean | null
          word_id?: string | null
        }
        Update: {
          base_score?: number
          completion_time_seconds?: number | null
          correct?: boolean
          game_session_id?: string | null
          guess_penalty?: number
          guesses_used?: number | null
          hint_penalty?: number
          id?: string
          nickname?: string | null
          player_id?: string
          score?: number
          submitted_at?: string | null
          time_penalty?: number
          used_hint?: boolean | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_scores_game_session"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_scores_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "fk_scores_word"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          average_completion_time: number | null
          best_rank: number | null
          current_streak: number | null
          games_played: number | null
          last_played_word: string | null
          longest_streak: number | null
          player_id: string
          top_10_count: number | null
        }
        Insert: {
          average_completion_time?: number | null
          best_rank?: number | null
          current_streak?: number | null
          games_played?: number | null
          last_played_word?: string | null
          longest_streak?: number | null
          player_id: string
          top_10_count?: number | null
        }
        Update: {
          average_completion_time?: number | null
          best_rank?: number | null
          current_streak?: number | null
          games_played?: number | null
          last_played_word?: string | null
          longest_streak?: number | null
          player_id?: string
          top_10_count?: number | null
        }
        Relationships: []
      }
      words: {
        Row: {
          date: string | null
          definition: string | null
          difficulty: string | null
          equivalents: string | null
          etymology: string | null
          first_letter: string | null
          id: string
          in_a_sentence: string | null
          number_of_letters: number | null
          word: string | null
        }
        Insert: {
          date?: string | null
          definition?: string | null
          difficulty?: string | null
          equivalents?: string | null
          etymology?: string | null
          first_letter?: string | null
          id?: string
          in_a_sentence?: string | null
          number_of_letters?: number | null
          word?: string | null
        }
        Update: {
          date?: string | null
          definition?: string | null
          difficulty?: string | null
          equivalents?: string | null
          etymology?: string | null
          first_letter?: string | null
          id?: string
          in_a_sentence?: string | null
          number_of_letters?: number | null
          word?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_player_exists: {
        Args: { p_id: string }
        Returns: string
      }
      get_leaderboard_for_word: {
        Args: { word_id: string; limit_count?: number }
        Returns: {
          player_id: string
          rank: number
          guesses_used: number
          completion_time_seconds: number
          used_hint: boolean
          submitted_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
