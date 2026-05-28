export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      retros: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          template_type: string;
          config: Json;
          phase: "lobby" | "write" | "group" | "vote" | "discuss" | "summary";
          created_by: string | null;
          moderator_id: string | null;
          created_at: string;
          current_discussion_card_id: string | null;
          archived_at: string | null;
          phase_started_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          template_type: string;
          config?: Json;
          phase?: "lobby" | "write" | "group" | "vote" | "discuss" | "summary";
          created_by?: string | null;
          moderator_id?: string | null;
          created_at?: string;
          current_discussion_card_id?: string | null;
          archived_at?: string | null;
          phase_started_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          template_type?: string;
          config?: Json;
          phase?: "lobby" | "write" | "group" | "vote" | "discuss" | "summary";
          created_by?: string | null;
          moderator_id?: string | null;
          created_at?: string;
          current_discussion_card_id?: string | null;
          archived_at?: string | null;
          phase_started_at?: string | null;
        };
        Relationships: [];
      };
      retro_participants: {
        Row: {
          id: string;
          retro_id: string;
          user_id: string | null;
          guest_name: string | null;
          guest_id: string | null;
          joined_at: string;
          online: boolean;
        };
        Insert: {
          id?: string;
          retro_id: string;
          user_id?: string | null;
          guest_name?: string | null;
          guest_id?: string | null;
          joined_at?: string;
          online?: boolean;
        };
        Update: {
          id?: string;
          retro_id?: string;
          user_id?: string | null;
          guest_name?: string | null;
          guest_id?: string | null;
          joined_at?: string;
          online?: boolean;
        };
        Relationships: [];
      };
      retro_cards: {
        Row: {
          id: string;
          retro_id: string;
          author_id: string | null;
          participant_id: string | null;
          content: string;
          column_name: string;
          group_id: string | null;
          author_revealed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          retro_id: string;
          author_id?: string | null;
          participant_id?: string | null;
          content: string;
          column_name: string;
          group_id?: string | null;
          author_revealed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          retro_id?: string;
          author_id?: string | null;
          participant_id?: string | null;
          content?: string;
          column_name?: string;
          group_id?: string | null;
          author_revealed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      retro_groups: {
        Row: {
          id: string;
          retro_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          retro_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          retro_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      retro_votes: {
        Row: {
          id: string;
          retro_id: string;
          card_id: string;
          participant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          retro_id: string;
          card_id: string;
          participant_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          retro_id?: string;
          card_id?: string;
          participant_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      action_items: {
        Row: {
          id: string;
          retro_id: string;
          content: string;
          owner_id: string | null;
          assigned_to_user_id: string | null;
          due_date: string | null;
          created_by: string | null;
          completed: boolean;
          created_at: string;
          card_id: string | null;
          carried_over_from: string | null;
        };
        Insert: {
          id?: string;
          retro_id: string;
          content: string;
          owner_id?: string | null;
          assigned_to_user_id?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          completed?: boolean;
          created_at?: string;
          card_id?: string | null;
          carried_over_from?: string | null;
        };
        Update: {
          id?: string;
          retro_id?: string;
          content?: string;
          owner_id?: string | null;
          assigned_to_user_id?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          completed?: boolean;
          created_at?: string;
          card_id?: string | null;
          carried_over_from?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "action_items_retro_id_fkey";
            columns: ["retro_id"];
            isOneToOne: false;
            referencedRelation: "retros";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_items_assigned_to_user_id_fkey";
            columns: ["assigned_to_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_links: {
        Row: {
          id: string;
          team_id: string;
          token: string;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          token: string;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          token?: string;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      retro_templates: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          columns: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          columns: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          columns?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_moderator: {
        Args: { p_retro_id: string };
        Returns: undefined;
      };
      dissolve_group_if_empty: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      join_team_via_invite: {
        Args: { p_token: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
