export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
      }
      retros: {
        Row: {
          id: string
          team_id: string
          name: string
          template_type: string
          config: Json
          phase: 'lobby' | 'write' | 'group' | 'vote' | 'discuss' | 'summary'
          created_by: string | null
          created_at: string
          current_discussion_card_id: string | null
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          template_type: string
          config?: Json
          phase?: 'lobby' | 'write' | 'group' | 'vote' | 'discuss' | 'summary'
          created_by?: string | null
          created_at?: string
          current_discussion_card_id?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          template_type?: string
          config?: Json
          phase?: 'lobby' | 'write' | 'group' | 'vote' | 'discuss' | 'summary'
          created_by?: string | null
          created_at?: string
          current_discussion_card_id?: string | null
        }
      }
      retro_participants: {
        Row: {
          id: string
          retro_id: string
          user_id: string | null
          guest_name: string | null
          guest_id: string | null
          joined_at: string
          online: boolean
        }
        Insert: {
          id?: string
          retro_id: string
          user_id?: string | null
          guest_name?: string | null
          guest_id?: string | null
          joined_at?: string
          online?: boolean
        }
        Update: {
          id?: string
          retro_id?: string
          user_id?: string | null
          guest_name?: string | null
          guest_id?: string | null
          joined_at?: string
          online?: boolean
        }
      }
      retro_cards: {
        Row: {
          id: string
          retro_id: string
          author_id: string | null
          participant_id: string | null
          content: string
          column_name: string
          group_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          retro_id: string
          author_id?: string | null
          participant_id?: string | null
          content: string
          column_name: string
          group_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          retro_id?: string
          author_id?: string | null
          participant_id?: string | null
          content?: string
          column_name?: string
          group_id?: string | null
          created_at?: string
        }
      }
      retro_groups: {
        Row: {
          id: string
          retro_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          retro_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          retro_id?: string
          name?: string
          created_at?: string
        }
      }
      retro_votes: {
        Row: {
          id: string
          retro_id: string
          card_id: string
          participant_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          retro_id: string
          card_id: string
          participant_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          retro_id?: string
          card_id?: string
          participant_id?: string | null
          created_at?: string
        }
      }
      action_items: {
        Row: {
          id: string
          retro_id: string
          content: string
          owner_id: string | null
          completed: boolean
          created_at: string
          card_id: string | null
        }
        Insert: {
          id?: string
          retro_id: string
          content: string
          owner_id?: string | null
          completed?: boolean
          created_at?: string
          card_id?: string | null
        }
        Update: {
          id?: string
          retro_id?: string
          content?: string
          owner_id?: string | null
          completed?: boolean
          created_at?: string
          card_id?: string | null
        }
      }
      invite_links: {
        Row: {
          id: string
          team_id: string
          token: string
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          token: string
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          token?: string
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
