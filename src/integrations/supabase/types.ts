export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_casino_config: {
        Row: {
          description: string | null;
          id: string;
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          id?: string;
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          id?: string;
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      admin_pin_credentials: {
        Row: {
          failed_attempts: number | null;
          id: string;
          locked_until: string | null;
          pin_hash: string;
          updated_at: string | null;
        };
        Insert: {
          failed_attempts?: number | null;
          id?: string;
          locked_until?: string | null;
          pin_hash: string;
          updated_at?: string | null;
        };
        Update: {
          failed_attempts?: number | null;
          id?: string;
          locked_until?: string | null;
          pin_hash?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      admin_pin_sessions: {
        Row: {
          created_at: string | null;
          expires_at: string;
          token: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at?: string;
          token: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          token?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      anomaly_events: {
        Row: {
          created_at: string | null;
          details: Json | null;
          event_type: string;
          id: string;
          resolved: boolean | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          details?: Json | null;
          event_type: string;
          id?: string;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          details?: Json | null;
          event_type?: string;
          id?: string;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip_address: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      blockchain_deposits: {
        Row: {
          amount: number | null;
          block_number: number | null;
          chain: string | null;
          confirmed: boolean | null;
          created_at: string | null;
          credited: boolean | null;
          credited_at: string | null;
          currency: string | null;
          from_address: string | null;
          id: string;
          to_address: string | null;
          tx_hash: string;
          user_id: string | null;
        };
        Insert: {
          amount?: number | null;
          block_number?: number | null;
          chain?: string | null;
          confirmed?: boolean | null;
          created_at?: string | null;
          credited?: boolean | null;
          credited_at?: string | null;
          currency?: string | null;
          from_address?: string | null;
          id?: string;
          to_address?: string | null;
          tx_hash: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number | null;
          block_number?: number | null;
          chain?: string | null;
          confirmed?: boolean | null;
          created_at?: string | null;
          credited?: boolean | null;
          credited_at?: string | null;
          currency?: string | null;
          from_address?: string | null;
          id?: string;
          to_address?: string | null;
          tx_hash?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blockchain_deposits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_posts: {
        Row: {
          author_id: string | null;
          content: string | null;
          cover_image_url: string | null;
          created_at: string | null;
          excerpt: string | null;
          id: string;
          is_published: boolean | null;
          published_at: string | null;
          slug: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          content?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          excerpt?: string | null;
          id?: string;
          is_published?: boolean | null;
          published_at?: string | null;
          slug: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          content?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          excerpt?: string | null;
          id?: string;
          is_published?: boolean | null;
          published_at?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      bonus_campaigns: {
        Row: {
          amount: number | null;
          claimed_count: number | null;
          created_at: string | null;
          description: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          max_bonus: number | null;
          max_users: number | null;
          min_deposit: number | null;
          name: string;
          percentage: number | null;
          starts_at: string | null;
          total_given: number | null;
          type: string;
          wagering_requirement: number | null;
        };
        Insert: {
          amount?: number | null;
          claimed_count?: number | null;
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_bonus?: number | null;
          max_users?: number | null;
          min_deposit?: number | null;
          name: string;
          percentage?: number | null;
          starts_at?: string | null;
          total_given?: number | null;
          type: string;
          wagering_requirement?: number | null;
        };
        Update: {
          amount?: number | null;
          claimed_count?: number | null;
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_bonus?: number | null;
          max_users?: number | null;
          min_deposit?: number | null;
          name?: string;
          percentage?: number | null;
          starts_at?: string | null;
          total_given?: number | null;
          type?: string;
          wagering_requirement?: number | null;
        };
        Relationships: [];
      };
      bonus_claims: {
        Row: {
          amount: number;
          campaign_id: string | null;
          claimed_at: string | null;
          completed_at: string | null;
          id: string;
          status: string | null;
          user_id: string;
          wagered: number | null;
          wagering_requirement: number | null;
        };
        Insert: {
          amount: number;
          campaign_id?: string | null;
          claimed_at?: string | null;
          completed_at?: string | null;
          id?: string;
          status?: string | null;
          user_id: string;
          wagered?: number | null;
          wagering_requirement?: number | null;
        };
        Update: {
          amount?: number;
          campaign_id?: string | null;
          claimed_at?: string | null;
          completed_at?: string | null;
          id?: string;
          status?: string | null;
          user_id?: string;
          wagered?: number | null;
          wagering_requirement?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bonus_claims_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "bonus_campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      casino_bets: {
        Row: {
          bet_amount: number;
          created_at: string | null;
          game_type: string;
          id: string;
          is_win: boolean | null;
          multiplier: number | null;
          payout: number | null;
          profit: number | null;
          result: Json | null;
          session_id: string | null;
          user_id: string;
        };
        Insert: {
          bet_amount: number;
          created_at?: string | null;
          game_type: string;
          id?: string;
          is_win?: boolean | null;
          multiplier?: number | null;
          payout?: number | null;
          profit?: number | null;
          result?: Json | null;
          session_id?: string | null;
          user_id: string;
        };
        Update: {
          bet_amount?: number;
          created_at?: string | null;
          game_type?: string;
          id?: string;
          is_win?: boolean | null;
          multiplier?: number | null;
          payout?: number | null;
          profit?: number | null;
          result?: Json | null;
          session_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "casino_bets_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      casino_settings: {
        Row: {
          created_at: string | null;
          daily_deposit_limit: number | null;
          daily_loss_limit: number | null;
          id: string;
          self_excluded_until: string | null;
          session_time_limit: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          daily_deposit_limit?: number | null;
          daily_loss_limit?: number | null;
          id?: string;
          self_excluded_until?: string | null;
          session_time_limit?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          daily_deposit_limit?: number | null;
          daily_loss_limit?: number | null;
          id?: string;
          self_excluded_until?: string | null;
          session_time_limit?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      casino_transactions: {
        Row: {
          amount: number;
          balance_after: number | null;
          balance_before: number | null;
          chain: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          engine: string | null;
          game_type: string | null;
          id: string;
          idempotency_key: string | null;
          reference_id: string | null;
          status: string | null;
          tx_code: string | null;
          type: string;
          user_id: string;
          wallet_address: string | null;
        };
        Insert: {
          amount: number;
          balance_after?: number | null;
          balance_before?: number | null;
          chain?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          engine?: string | null;
          game_type?: string | null;
          id?: string;
          idempotency_key?: string | null;
          reference_id?: string | null;
          status?: string | null;
          tx_code?: string | null;
          type: string;
          user_id: string;
          wallet_address?: string | null;
        };
        Update: {
          amount?: number;
          balance_after?: number | null;
          balance_before?: number | null;
          chain?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          engine?: string | null;
          game_type?: string | null;
          id?: string;
          idempotency_key?: string | null;
          reference_id?: string | null;
          status?: string | null;
          tx_code?: string | null;
          type?: string;
          user_id?: string;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      casino_wallets: {
        Row: {
          balance: number;
          created_at: string | null;
          currency: string;
          id: string;
          quarantine: boolean;
          quarantine_reason: string | null;
          quarantined_at: string | null;
          total_deposited: number | null;
          total_wagered: number | null;
          total_withdrawn: number | null;
          total_won: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          balance?: number;
          created_at?: string | null;
          currency?: string;
          id?: string;
          quarantine?: boolean;
          quarantine_reason?: string | null;
          quarantined_at?: string | null;
          total_deposited?: number | null;
          total_wagered?: number | null;
          total_withdrawn?: number | null;
          total_won?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string | null;
          currency?: string;
          id?: string;
          quarantine?: boolean;
          quarantine_reason?: string | null;
          quarantined_at?: string | null;
          total_deposited?: number | null;
          total_wagered?: number | null;
          total_withdrawn?: number | null;
          total_won?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          body: string;
          created_at: string | null;
          id: number;
          room: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          id?: number;
          room?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          id?: number;
          room?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coin_grants: {
        Row: {
          amount: number;
          grant_type: string;
          granted_at: string;
          id: string;
          metadata: Json | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          grant_type: string;
          granted_at?: string;
          id?: string;
          metadata?: Json | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          grant_type?: string;
          granted_at?: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          message: string | null;
          name: string | null;
          phone_hash: string | null;
          status: string | null;
          subject: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          message?: string | null;
          name?: string | null;
          phone_hash?: string | null;
          status?: string | null;
          subject?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          message?: string | null;
          name?: string | null;
          phone_hash?: string | null;
          status?: string | null;
          subject?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      containment_thresholds: {
        Row: {
          key: string;
          notes: string | null;
          updated_at: string;
          updated_by: string | null;
          value: number;
        };
        Insert: {
          key: string;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          value: number;
        };
        Update: {
          key?: string;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          value?: number;
        };
        Relationships: [];
      };
      crash_bets: {
        Row: {
          auto_cashout: number | null;
          bet_amount: number;
          cashed_out_at: number | null;
          created_at: string | null;
          id: string;
          is_win: boolean | null;
          payout: number | null;
          round_id: string | null;
          user_id: string;
        };
        Insert: {
          auto_cashout?: number | null;
          bet_amount: number;
          cashed_out_at?: number | null;
          created_at?: string | null;
          id?: string;
          is_win?: boolean | null;
          payout?: number | null;
          round_id?: string | null;
          user_id: string;
        };
        Update: {
          auto_cashout?: number | null;
          bet_amount?: number;
          cashed_out_at?: number | null;
          created_at?: string | null;
          id?: string;
          is_win?: boolean | null;
          payout?: number | null;
          round_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crash_bets_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "crash_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crash_bets_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "crash_rounds_safe";
            referencedColumns: ["id"];
          },
        ];
      };
      crash_rounds: {
        Row: {
          crash_point: number | null;
          crashed_at: string | null;
          created_at: string | null;
          id: string;
          round_number: number;
          server_seed: string;
          server_seed_hash: string;
          started_at: string | null;
          status: string | null;
        };
        Insert: {
          crash_point?: number | null;
          crashed_at?: string | null;
          created_at?: string | null;
          id?: string;
          round_number?: number;
          server_seed: string;
          server_seed_hash: string;
          started_at?: string | null;
          status?: string | null;
        };
        Update: {
          crash_point?: number | null;
          crashed_at?: string | null;
          created_at?: string | null;
          id?: string;
          round_number?: number;
          server_seed?: string;
          server_seed_hash?: string;
          started_at?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      crypto_deposits: {
        Row: {
          amount: number;
          block_number: number | null;
          chain: string;
          confirmations: number | null;
          created_at: string | null;
          credited_at: string | null;
          currency: string | null;
          deposit_address_id: string | null;
          from_address: string | null;
          id: string;
          required_confirmations: number | null;
          status: string | null;
          tx_hash: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          block_number?: number | null;
          chain: string;
          confirmations?: number | null;
          created_at?: string | null;
          credited_at?: string | null;
          currency?: string | null;
          deposit_address_id?: string | null;
          from_address?: string | null;
          id?: string;
          required_confirmations?: number | null;
          status?: string | null;
          tx_hash: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          block_number?: number | null;
          chain?: string;
          confirmations?: number | null;
          created_at?: string | null;
          credited_at?: string | null;
          currency?: string | null;
          deposit_address_id?: string | null;
          from_address?: string | null;
          id?: string;
          required_confirmations?: number | null;
          status?: string | null;
          tx_hash?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_deposits_deposit_address_id_fkey";
            columns: ["deposit_address_id"];
            isOneToOne: false;
            referencedRelation: "user_deposit_addresses";
            referencedColumns: ["id"];
          },
        ];
      };
      crypto_withdrawals: {
        Row: {
          amount: number;
          chain: string;
          created_at: string | null;
          currency: string | null;
          fee: number | null;
          id: string;
          net_amount: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string | null;
          to_address: string;
          tx_hash: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          chain: string;
          created_at?: string | null;
          currency?: string | null;
          fee?: number | null;
          id?: string;
          net_amount?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
          to_address: string;
          tx_hash?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          chain?: string;
          created_at?: string | null;
          currency?: string | null;
          fee?: number | null;
          id?: string;
          net_amount?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
          to_address?: string;
          tx_hash?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      deposit_monitors: {
        Row: {
          chain: string;
          created_at: string | null;
          error_count: number | null;
          id: string;
          is_running: boolean | null;
          last_block_checked: number | null;
          last_run_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          chain: string;
          created_at?: string | null;
          error_count?: number | null;
          id?: string;
          is_running?: boolean | null;
          last_block_checked?: number | null;
          last_run_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          chain?: string;
          created_at?: string | null;
          error_count?: number | null;
          id?: string;
          is_running?: boolean | null;
          last_block_checked?: number | null;
          last_run_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      email_otps: {
        Row: {
          attempts: number;
          code_hash: string;
          consumed_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
        };
        Insert: {
          attempts?: number;
          code_hash: string;
          consumed_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
        };
        Update: {
          attempts?: number;
          code_hash?: string;
          consumed_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      email_send_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          recipient_email: string | null;
          status: string;
          template_name: string | null;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          recipient_email?: string | null;
          status?: string;
          template_name?: string | null;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          recipient_email?: string | null;
          status?: string;
          template_name?: string | null;
        };
        Relationships: [];
      };
      email_unsubscribe_tokens: {
        Row: {
          created_at: string;
          email: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      engine_circuit_breakers: {
        Row: {
          auto_reset_at: string | null;
          metadata: Json;
          reason: string | null;
          scope: string;
          state: string;
          tripped_at: string | null;
          tripped_by: string | null;
          updated_at: string;
        };
        Insert: {
          auto_reset_at?: string | null;
          metadata?: Json;
          reason?: string | null;
          scope: string;
          state?: string;
          tripped_at?: string | null;
          tripped_by?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_reset_at?: string | null;
          metadata?: Json;
          reason?: string | null;
          scope?: string;
          state?: string;
          tripped_at?: string | null;
          tripped_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fair_seeds: {
        Row: {
          client_seed: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          nonce: number | null;
          revealed_at: string | null;
          server_seed: string;
          server_seed_hash: string;
          user_id: string;
        };
        Insert: {
          client_seed?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          nonce?: number | null;
          revealed_at?: string | null;
          server_seed: string;
          server_seed_hash: string;
          user_id: string;
        };
        Update: {
          client_seed?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          nonce?: number | null;
          revealed_at?: string | null;
          server_seed?: string;
          server_seed_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fiat_topups: {
        Row: {
          amount: number;
          bonus_amount: number | null;
          bonus_credited_at: string | null;
          bonus_percent: number | null;
          created_at: string | null;
          credited_at: string | null;
          currency: string | null;
          id: string;
          metadata: Json | null;
          pack_id: string | null;
          provider: string;
          provider_payment_id: string | null;
          provider_session_id: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          bonus_amount?: number | null;
          bonus_credited_at?: string | null;
          bonus_percent?: number | null;
          created_at?: string | null;
          credited_at?: string | null;
          currency?: string | null;
          id?: string;
          metadata?: Json | null;
          pack_id?: string | null;
          provider: string;
          provider_payment_id?: string | null;
          provider_session_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          bonus_amount?: number | null;
          bonus_credited_at?: string | null;
          bonus_percent?: number | null;
          created_at?: string | null;
          credited_at?: string | null;
          currency?: string | null;
          id?: string;
          metadata?: Json | null;
          pack_id?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          provider_session_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      game_catalog: {
        Row: {
          category: string;
          created_at: string | null;
          description: string | null;
          game_config: Json | null;
          house_edge: number;
          id: string;
          is_active: boolean;
          is_featured: boolean | null;
          max_bet: number;
          min_bet: number;
          name: string;
          slug: string;
          sort_order: number | null;
          thumbnail_url: string | null;
          tier: string | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          description?: string | null;
          game_config?: Json | null;
          house_edge?: number;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean | null;
          max_bet?: number;
          min_bet?: number;
          name: string;
          slug: string;
          sort_order?: number | null;
          thumbnail_url?: string | null;
          tier?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          description?: string | null;
          game_config?: Json | null;
          house_edge?: number;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean | null;
          max_bet?: number;
          min_bet?: number;
          name?: string;
          slug?: string;
          sort_order?: number | null;
          thumbnail_url?: string | null;
          tier?: string | null;
        };
        Relationships: [];
      };
      game_sessions: {
        Row: {
          bet_amount: number;
          client_seed: string;
          completed_at: string | null;
          created_at: string | null;
          currency: string | null;
          game_data: Json | null;
          game_type: string;
          id: string;
          is_win: boolean | null;
          multiplier: number | null;
          nonce: number;
          payout: number | null;
          profit: number | null;
          server_seed: string;
          server_seed_hash: string;
          status: string;
          user_id: string;
        };
        Insert: {
          bet_amount: number;
          client_seed?: string;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          game_data?: Json | null;
          game_type: string;
          id?: string;
          is_win?: boolean | null;
          multiplier?: number | null;
          nonce?: number;
          payout?: number | null;
          profit?: number | null;
          server_seed: string;
          server_seed_hash: string;
          status?: string;
          user_id: string;
        };
        Update: {
          bet_amount?: number;
          client_seed?: string;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          game_data?: Json | null;
          game_type?: string;
          id?: string;
          is_win?: boolean | null;
          multiplier?: number | null;
          nonce?: number;
          payout?: number | null;
          profit?: number | null;
          server_seed?: string;
          server_seed_hash?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      geo_settings: {
        Row: {
          country_code: string;
          country_name: string | null;
          created_at: string | null;
          id: string;
          is_blocked: boolean | null;
          reason: string | null;
        };
        Insert: {
          country_code: string;
          country_name?: string | null;
          created_at?: string | null;
          id?: string;
          is_blocked?: boolean | null;
          reason?: string | null;
        };
        Update: {
          country_code?: string;
          country_name?: string | null;
          created_at?: string | null;
          id?: string;
          is_blocked?: boolean | null;
          reason?: string | null;
        };
        Relationships: [];
      };
      incoming_deposits: {
        Row: {
          amount: number;
          block_timestamp: string;
          chain: string;
          credited_at: string | null;
          credited_by: string | null;
          currency: string;
          detected_at: string;
          from_address: string;
          id: string;
          matched_user_id: string | null;
          notes: string | null;
          status: string;
          to_address: string;
          tx_hash: string;
        };
        Insert: {
          amount: number;
          block_timestamp: string;
          chain?: string;
          credited_at?: string | null;
          credited_by?: string | null;
          currency?: string;
          detected_at?: string;
          from_address: string;
          id?: string;
          matched_user_id?: string | null;
          notes?: string | null;
          status?: string;
          to_address: string;
          tx_hash: string;
        };
        Update: {
          amount?: number;
          block_timestamp?: string;
          chain?: string;
          credited_at?: string | null;
          credited_by?: string | null;
          currency?: string;
          detected_at?: string;
          from_address?: string;
          id?: string;
          matched_user_id?: string | null;
          notes?: string | null;
          status?: string;
          to_address?: string;
          tx_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incoming_deposits_credited_by_fkey";
            columns: ["credited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incoming_deposits_matched_user_id_fkey";
            columns: ["matched_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ip_blocklist: {
        Row: {
          blocked_by: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          ip_address: string;
          reason: string | null;
        };
        Insert: {
          blocked_by?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address: string;
          reason?: string | null;
        };
        Update: {
          blocked_by?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      jackpot_wins: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          jackpot_id: string | null;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          jackpot_id?: string | null;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          jackpot_id?: string | null;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_wins_jackpot_id_fkey";
            columns: ["jackpot_id"];
            isOneToOne: false;
            referencedRelation: "jackpots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jackpot_wins_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      jackpots: {
        Row: {
          contribution_rate: number | null;
          created_at: string | null;
          current_amount: number;
          id: string;
          is_active: boolean | null;
          min_bet_to_qualify: number | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          contribution_rate?: number | null;
          created_at?: string | null;
          current_amount?: number;
          id?: string;
          is_active?: boolean | null;
          min_bet_to_qualify?: number | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          contribution_rate?: number | null;
          created_at?: string | null;
          current_amount?: number;
          id?: string;
          is_active?: boolean | null;
          min_bet_to_qualify?: number | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      kyc_submissions: {
        Row: {
          address_text: string | null;
          date_of_birth: string | null;
          document_back_url: string | null;
          document_front_url: string | null;
          document_type: string;
          full_name: string | null;
          id: number;
          nationality: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_url: string | null;
          status: string | null;
          submitted_at: string | null;
          user_id: string;
        };
        Insert: {
          address_text?: string | null;
          date_of_birth?: string | null;
          document_back_url?: string | null;
          document_front_url?: string | null;
          document_type: string;
          full_name?: string | null;
          id?: number;
          nationality?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_url?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          user_id: string;
        };
        Update: {
          address_text?: string | null;
          date_of_birth?: string | null;
          document_back_url?: string | null;
          document_front_url?: string | null;
          document_type?: string;
          full_name?: string | null;
          id?: number;
          nationality?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_url?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      legacy_usdt_audit: {
        Row: {
          balance_before: number;
          id: string;
          snapshot_at: string;
          total_deposited_before: number | null;
          total_wagered_before: number | null;
          total_withdrawn_before: number | null;
          total_won_before: number | null;
          user_id: string;
        };
        Insert: {
          balance_before: number;
          id?: string;
          snapshot_at?: string;
          total_deposited_before?: number | null;
          total_wagered_before?: number | null;
          total_withdrawn_before?: number | null;
          total_won_before?: number | null;
          user_id: string;
        };
        Update: {
          balance_before?: number;
          id?: string;
          snapshot_at?: string;
          total_deposited_before?: number | null;
          total_wagered_before?: number | null;
          total_withdrawn_before?: number | null;
          total_won_before?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: number;
          is_read: boolean | null;
          message: string;
          meta: Json | null;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          is_read?: boolean | null;
          message: string;
          meta?: Json | null;
          title: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          is_read?: boolean | null;
          message?: string;
          meta?: Json | null;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      otp_codes: {
        Row: {
          attempts: number;
          code: string;
          code_hash: string | null;
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          max_attempts: number;
          used: boolean | null;
          used_at: string | null;
        };
        Insert: {
          attempts?: number;
          code: string;
          code_hash?: string | null;
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          max_attempts?: number;
          used?: boolean | null;
          used_at?: string | null;
        };
        Update: {
          attempts?: number;
          code?: string;
          code_hash?: string | null;
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          max_attempts?: number;
          used?: boolean | null;
          used_at?: string | null;
        };
        Relationships: [];
      };
      owner_withdrawals: {
        Row: {
          admin_user_id: string | null;
          amount: number;
          chain: string;
          completed_at: string | null;
          created_at: string | null;
          currency: string | null;
          from_wallet: string | null;
          from_wallet_id: string | null;
          id: string;
          last_verified_at: string | null;
          provider_status: string | null;
          provider_withdrawal_id: string | null;
          sent_at: string | null;
          status: string | null;
          to_address: string;
          tx_hash: string | null;
          updated_at: string | null;
          verify_attempts: number;
          verify_error: string | null;
        };
        Insert: {
          admin_user_id?: string | null;
          amount: number;
          chain: string;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          from_wallet?: string | null;
          from_wallet_id?: string | null;
          id?: string;
          last_verified_at?: string | null;
          provider_status?: string | null;
          provider_withdrawal_id?: string | null;
          sent_at?: string | null;
          status?: string | null;
          to_address: string;
          tx_hash?: string | null;
          updated_at?: string | null;
          verify_attempts?: number;
          verify_error?: string | null;
        };
        Update: {
          admin_user_id?: string | null;
          amount?: number;
          chain?: string;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          from_wallet?: string | null;
          from_wallet_id?: string | null;
          id?: string;
          last_verified_at?: string | null;
          provider_status?: string | null;
          provider_withdrawal_id?: string | null;
          sent_at?: string | null;
          status?: string | null;
          to_address?: string;
          tx_hash?: string | null;
          updated_at?: string | null;
          verify_attempts?: number;
          verify_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "owner_withdrawals_from_wallet_id_fkey";
            columns: ["from_wallet_id"];
            isOneToOne: false;
            referencedRelation: "platform_wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      part_config: {
        Row: {
          async_partitioning_in_progress: string | null;
          automatic_maintenance: string;
          constraint_cols: string[] | null;
          constraint_valid: boolean;
          control: string;
          date_trunc_interval: string | null;
          datetime_string: string | null;
          epoch: string;
          ignore_default_data: boolean;
          infinite_time_partitions: boolean;
          inherit_privileges: boolean | null;
          jobmon: boolean;
          maintenance_last_run: string | null;
          maintenance_order: number | null;
          optimize_constraint: number;
          parent_table: string;
          partition_interval: string;
          partition_type: string;
          premake: number;
          retention: string | null;
          retention_keep_index: boolean;
          retention_keep_publication: boolean;
          retention_keep_table: boolean;
          retention_schema: string | null;
          sub_partition_set_full: boolean;
          template_table: string | null;
          time_decoder: string | null;
          time_encoder: string | null;
          undo_in_progress: boolean;
        };
        Insert: {
          async_partitioning_in_progress?: string | null;
          automatic_maintenance?: string;
          constraint_cols?: string[] | null;
          constraint_valid?: boolean;
          control: string;
          date_trunc_interval?: string | null;
          datetime_string?: string | null;
          epoch?: string;
          ignore_default_data?: boolean;
          infinite_time_partitions?: boolean;
          inherit_privileges?: boolean | null;
          jobmon?: boolean;
          maintenance_last_run?: string | null;
          maintenance_order?: number | null;
          optimize_constraint?: number;
          parent_table: string;
          partition_interval: string;
          partition_type: string;
          premake?: number;
          retention?: string | null;
          retention_keep_index?: boolean;
          retention_keep_publication?: boolean;
          retention_keep_table?: boolean;
          retention_schema?: string | null;
          sub_partition_set_full?: boolean;
          template_table?: string | null;
          time_decoder?: string | null;
          time_encoder?: string | null;
          undo_in_progress?: boolean;
        };
        Update: {
          async_partitioning_in_progress?: string | null;
          automatic_maintenance?: string;
          constraint_cols?: string[] | null;
          constraint_valid?: boolean;
          control?: string;
          date_trunc_interval?: string | null;
          datetime_string?: string | null;
          epoch?: string;
          ignore_default_data?: boolean;
          infinite_time_partitions?: boolean;
          inherit_privileges?: boolean | null;
          jobmon?: boolean;
          maintenance_last_run?: string | null;
          maintenance_order?: number | null;
          optimize_constraint?: number;
          parent_table?: string;
          partition_interval?: string;
          partition_type?: string;
          premake?: number;
          retention?: string | null;
          retention_keep_index?: boolean;
          retention_keep_publication?: boolean;
          retention_keep_table?: boolean;
          retention_schema?: string | null;
          sub_partition_set_full?: boolean;
          template_table?: string | null;
          time_decoder?: string | null;
          time_encoder?: string | null;
          undo_in_progress?: boolean;
        };
        Relationships: [];
      };
      part_config_sub: {
        Row: {
          sub_automatic_maintenance: string;
          sub_constraint_cols: string[] | null;
          sub_constraint_valid: boolean;
          sub_control: string;
          sub_control_not_null: boolean | null;
          sub_date_trunc_interval: string | null;
          sub_default_table: boolean | null;
          sub_epoch: string;
          sub_ignore_default_data: boolean;
          sub_infinite_time_partitions: boolean;
          sub_inherit_privileges: boolean | null;
          sub_jobmon: boolean;
          sub_maintenance_order: number | null;
          sub_optimize_constraint: number;
          sub_parent: string;
          sub_partition_interval: string;
          sub_partition_type: string;
          sub_premake: number;
          sub_retention: string | null;
          sub_retention_keep_index: boolean;
          sub_retention_keep_publication: boolean;
          sub_retention_keep_table: boolean;
          sub_retention_schema: string | null;
          sub_template_table: string | null;
          sub_time_decoder: string | null;
          sub_time_encoder: string | null;
        };
        Insert: {
          sub_automatic_maintenance?: string;
          sub_constraint_cols?: string[] | null;
          sub_constraint_valid?: boolean;
          sub_control: string;
          sub_control_not_null?: boolean | null;
          sub_date_trunc_interval?: string | null;
          sub_default_table?: boolean | null;
          sub_epoch?: string;
          sub_ignore_default_data?: boolean;
          sub_infinite_time_partitions?: boolean;
          sub_inherit_privileges?: boolean | null;
          sub_jobmon?: boolean;
          sub_maintenance_order?: number | null;
          sub_optimize_constraint?: number;
          sub_parent: string;
          sub_partition_interval: string;
          sub_partition_type: string;
          sub_premake?: number;
          sub_retention?: string | null;
          sub_retention_keep_index?: boolean;
          sub_retention_keep_publication?: boolean;
          sub_retention_keep_table?: boolean;
          sub_retention_schema?: string | null;
          sub_template_table?: string | null;
          sub_time_decoder?: string | null;
          sub_time_encoder?: string | null;
        };
        Update: {
          sub_automatic_maintenance?: string;
          sub_constraint_cols?: string[] | null;
          sub_constraint_valid?: boolean;
          sub_control?: string;
          sub_control_not_null?: boolean | null;
          sub_date_trunc_interval?: string | null;
          sub_default_table?: boolean | null;
          sub_epoch?: string;
          sub_ignore_default_data?: boolean;
          sub_infinite_time_partitions?: boolean;
          sub_inherit_privileges?: boolean | null;
          sub_jobmon?: boolean;
          sub_maintenance_order?: number | null;
          sub_optimize_constraint?: number;
          sub_parent?: string;
          sub_partition_interval?: string;
          sub_partition_type?: string;
          sub_premake?: number;
          sub_retention?: string | null;
          sub_retention_keep_index?: boolean;
          sub_retention_keep_publication?: boolean;
          sub_retention_keep_table?: boolean;
          sub_retention_schema?: string | null;
          sub_template_table?: string | null;
          sub_time_decoder?: string | null;
          sub_time_encoder?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "part_config_sub_sub_parent_fkey";
            columns: ["sub_parent"];
            isOneToOne: true;
            referencedRelation: "part_config";
            referencedColumns: ["parent_table"];
          },
        ];
      };
      payment_gateway_keys: {
        Row: {
          key: string;
          updated_at: string | null;
          value: string | null;
        };
        Insert: {
          key: string;
          updated_at?: string | null;
          value?: string | null;
        };
        Update: {
          key?: string;
          updated_at?: string | null;
          value?: string | null;
        };
        Relationships: [];
      };
      payout_requests: {
        Row: {
          account_details: Json;
          amount: number;
          created_at: string | null;
          currency: string | null;
          id: string;
          method: string;
          reviewed_by: string | null;
          status: string | null;
          tx_reference: string | null;
          user_id: string;
        };
        Insert: {
          account_details: Json;
          amount: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          method: string;
          reviewed_by?: string | null;
          status?: string | null;
          tx_reference?: string | null;
          user_id: string;
        };
        Update: {
          account_details?: Json;
          amount?: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          method?: string;
          reviewed_by?: string | null;
          status?: string | null;
          tx_reference?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      paypal_unmatched_payments: {
        Row: {
          amount: number | null;
          id: string;
          notes: string | null;
          payer_email: string | null;
          paypal_txn_id: string | null;
          received_at: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string | null;
        };
        Insert: {
          amount?: number | null;
          id?: string;
          notes?: string | null;
          payer_email?: string | null;
          paypal_txn_id?: string | null;
          received_at?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number | null;
          id?: string;
          notes?: string | null;
          payer_email?: string | null;
          paypal_txn_id?: string | null;
          received_at?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      platform_revenue: {
        Row: {
          active_players: number | null;
          created_at: string | null;
          date: string;
          deposit_count: number | null;
          ggr: number | null;
          id: string;
          jackpot_contributions: number | null;
          net_revenue: number | null;
          new_signups: number | null;
          owner_withdrawn: number | null;
          total_bets: number | null;
          total_deposited: number | null;
          total_payouts: number | null;
          total_withdrawn: number | null;
          updated_at: string | null;
          withdrawal_count: number | null;
          withdrawal_fees: number | null;
        };
        Insert: {
          active_players?: number | null;
          created_at?: string | null;
          date?: string;
          deposit_count?: number | null;
          ggr?: number | null;
          id?: string;
          jackpot_contributions?: number | null;
          net_revenue?: number | null;
          new_signups?: number | null;
          owner_withdrawn?: number | null;
          total_bets?: number | null;
          total_deposited?: number | null;
          total_payouts?: number | null;
          total_withdrawn?: number | null;
          updated_at?: string | null;
          withdrawal_count?: number | null;
          withdrawal_fees?: number | null;
        };
        Update: {
          active_players?: number | null;
          created_at?: string | null;
          date?: string;
          deposit_count?: number | null;
          ggr?: number | null;
          id?: string;
          jackpot_contributions?: number | null;
          net_revenue?: number | null;
          new_signups?: number | null;
          owner_withdrawn?: number | null;
          total_bets?: number | null;
          total_deposited?: number | null;
          total_payouts?: number | null;
          total_withdrawn?: number | null;
          updated_at?: string | null;
          withdrawal_count?: number | null;
          withdrawal_fees?: number | null;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      platform_wallets: {
        Row: {
          address: string;
          balance: number | null;
          chain: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          label: string | null;
          native_balance: number | null;
          private_key_encrypted: string | null;
          updated_at: string | null;
          wallet_type: string | null;
        };
        Insert: {
          address: string;
          balance?: number | null;
          chain: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          label?: string | null;
          native_balance?: number | null;
          private_key_encrypted?: string | null;
          updated_at?: string | null;
          wallet_type?: string | null;
        };
        Update: {
          address?: string;
          balance?: number | null;
          chain?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          label?: string | null;
          native_balance?: number | null;
          private_key_encrypted?: string | null;
          updated_at?: string | null;
          wallet_type?: string | null;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          published: boolean;
          slug: string;
          title: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          slug: string;
          title: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          slug?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          balance: number | null;
          country: string | null;
          created_at: string | null;
          currency: string | null;
          email: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          id: string;
          language: string | null;
          last_login: string | null;
          level: number | null;
          login_count: number | null;
          notifications_enabled: boolean | null;
          onboarding_completed: boolean | null;
          phone: string | null;
          referral_code: string | null;
          referred_by: string | null;
          role: string | null;
          theme: string | null;
          total_deposited: number | null;
          total_wagered: number | null;
          total_withdrawn: number | null;
          total_won: number | null;
          two_factor_enabled: boolean | null;
          updated_at: string | null;
          vip_tier: string | null;
          xp: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          balance?: number | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          email?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          id: string;
          language?: string | null;
          last_login?: string | null;
          level?: number | null;
          login_count?: number | null;
          notifications_enabled?: boolean | null;
          onboarding_completed?: boolean | null;
          phone?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          role?: string | null;
          theme?: string | null;
          total_deposited?: number | null;
          total_wagered?: number | null;
          total_withdrawn?: number | null;
          total_won?: number | null;
          two_factor_enabled?: boolean | null;
          updated_at?: string | null;
          vip_tier?: string | null;
          xp?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          balance?: number | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          email?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          id?: string;
          language?: string | null;
          last_login?: string | null;
          level?: number | null;
          login_count?: number | null;
          notifications_enabled?: boolean | null;
          onboarding_completed?: boolean | null;
          phone?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          role?: string | null;
          theme?: string | null;
          total_deposited?: number | null;
          total_wagered?: number | null;
          total_withdrawn?: number | null;
          total_won?: number | null;
          two_factor_enabled?: boolean | null;
          updated_at?: string | null;
          vip_tier?: string | null;
          xp?: number | null;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          ai_category: string | null;
          ai_confidence: number | null;
          ai_last_error: string | null;
          ai_priority: string | null;
          ai_summary: string | null;
          body: string;
          created_at: string;
          id: number;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_category?: string | null;
          ai_confidence?: number | null;
          ai_last_error?: string | null;
          ai_priority?: string | null;
          ai_summary?: string | null;
          body: string;
          created_at?: string;
          id?: never;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_category?: string | null;
          ai_confidence?: number | null;
          ai_last_error?: string | null;
          ai_priority?: string | null;
          ai_summary?: string | null;
          body?: string;
          created_at?: string;
          id?: never;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      suppressed_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          reason: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          reason?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      transactional_email_queue: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          queue_name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload: Json;
          processed_at?: string | null;
          queue_name?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          queue_name?: string;
        };
        Relationships: [];
      };
      transfer_logs: {
        Row: {
          amount: number;
          chain: string | null;
          created_at: string | null;
          currency: string | null;
          error: string | null;
          from_address: string | null;
          id: string;
          reference_id: string | null;
          status: string | null;
          to_address: string | null;
          tx_hash: string | null;
          type: string | null;
        };
        Insert: {
          amount: number;
          chain?: string | null;
          created_at?: string | null;
          currency?: string | null;
          error?: string | null;
          from_address?: string | null;
          id?: string;
          reference_id?: string | null;
          status?: string | null;
          to_address?: string | null;
          tx_hash?: string | null;
          type?: string | null;
        };
        Update: {
          amount?: number;
          chain?: string | null;
          created_at?: string | null;
          currency?: string | null;
          error?: string | null;
          from_address?: string | null;
          id?: string;
          reference_id?: string | null;
          status?: string | null;
          to_address?: string | null;
          tx_hash?: string | null;
          type?: string | null;
        };
        Relationships: [];
      };
      user_deposit_addresses: {
        Row: {
          address: string;
          chain: string;
          created_at: string | null;
          derived_index: number;
          id: string;
          is_active: boolean | null;
          user_id: string;
        };
        Insert: {
          address: string;
          chain: string;
          created_at?: string | null;
          derived_index?: number;
          id?: string;
          is_active?: boolean | null;
          user_id: string;
        };
        Update: {
          address?: string;
          chain?: string;
          created_at?: string | null;
          derived_index?: number;
          id?: string;
          is_active?: boolean | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          bio: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      wallet_snapshots: {
        Row: {
          balance: number;
          created_at: string | null;
          currency: string | null;
          id: string;
          snapshot_date: string;
          total_deposited: number | null;
          total_wagered: number | null;
          total_withdrawn: number | null;
          total_won: number | null;
          user_id: string;
        };
        Insert: {
          balance: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          snapshot_date?: string;
          total_deposited?: number | null;
          total_wagered?: number | null;
          total_withdrawn?: number | null;
          total_won?: number | null;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          snapshot_date?: string;
          total_deposited?: number | null;
          total_wagered?: number | null;
          total_withdrawn?: number | null;
          total_won?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          amount: number;
          chain: string;
          created_at: string | null;
          currency: string | null;
          fee: number | null;
          from_wallet: string | null;
          id: string;
          net_amount: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sent_at: string | null;
          status: string | null;
          tx_hash: string | null;
          user_id: string;
          wallet_address: string;
        };
        Insert: {
          amount: number;
          chain: string;
          created_at?: string | null;
          currency?: string | null;
          fee?: number | null;
          from_wallet?: string | null;
          id?: string;
          net_amount?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sent_at?: string | null;
          status?: string | null;
          tx_hash?: string | null;
          user_id: string;
          wallet_address: string;
        };
        Update: {
          amount?: number;
          chain?: string;
          created_at?: string | null;
          currency?: string | null;
          fee?: number | null;
          from_wallet?: string | null;
          id?: string;
          net_amount?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sent_at?: string | null;
          status?: string | null;
          tx_hash?: string | null;
          user_id?: string;
          wallet_address?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      crash_rounds_safe: {
        Row: {
          crash_point: number | null;
          crashed_at: string | null;
          created_at: string | null;
          id: string | null;
          round_number: number | null;
          server_seed: string | null;
          server_seed_hash: string | null;
          started_at: string | null;
          status: string | null;
        };
        Insert: {
          crash_point?: number | null;
          crashed_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          round_number?: number | null;
          server_seed?: never;
          server_seed_hash?: string | null;
          started_at?: string | null;
          status?: string | null;
        };
        Update: {
          crash_point?: number | null;
          crashed_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          round_number?: number | null;
          server_seed?: never;
          server_seed_hash?: string | null;
          started_at?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      table_privs: {
        Row: {
          grantee: unknown;
          grantor: unknown;
          privilege_type: string | null;
          table_name: unknown;
          table_schema: unknown;
        };
        Relationships: [];
      };
      treasury_summary: {
        Row: {
          available_profit: number | null;
          pending_withdrawals: number | null;
          total_cold: number | null;
          total_hot: number | null;
          total_platform_funds: number | null;
          total_user_balances: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_credit_deposit: {
        Args: { p_admin_note?: string; p_tx_hash: string; p_user_id: string };
        Returns: Json;
      };
      admin_hold_deposit: {
        Args: { p_admin_note?: string; p_tx_hash: string };
        Returns: Json;
      };
      admin_ignore_deposit: {
        Args: { p_admin_note: string; p_tx_hash: string };
        Returns: Json;
      };
      admin_list_audit_logs: {
        Args: { p_event_filter?: string; p_limit?: number };
        Returns: {
          amount: number;
          created_at: string;
          event_details: Json;
          event_type: string;
          id: string;
          ip_address: string;
          source: string;
          user_id: string;
        }[];
      };
      admin_list_bonuses: {
        Args: never;
        Returns: {
          amount: number;
          claimed_count: number;
          expiry: string;
          id: string;
          is_active: boolean;
          max_users: number;
          name: string;
          total_given: number;
          wagering_req: number;
        }[];
      };
      admin_list_unmatched_deposits: {
        Args: never;
        Returns: {
          amount: number;
          block_timestamp: string;
          chain: string;
          credited_at: string;
          credited_by: string;
          currency: string;
          detected_at: string;
          from_address: string;
          id: string;
          matched_user_email: string;
          matched_user_id: string;
          notes: string;
          status: string;
          to_address: string;
          tx_hash: string;
        }[];
      };
      admin_pending_withdrawals_with_profile: {
        Args: { p_limit?: number };
        Returns: {
          amount: number;
          created_at: string;
          currency: string;
          email: string;
          full_name: string;
          id: string;
          status: string;
          user_id: string;
          wallet_address: string;
        }[];
      };
      admin_reset_user_password: {
        Args: { new_password: string; target_email: string };
        Returns: boolean;
      };
      admin_treasury_recent_tx: {
        Args: { p_limit?: number };
        Returns: {
          amount: number;
          created_at: string;
          from_address: string;
          id: string;
          status: string;
          to_address: string;
          tx_hash: string;
          type: string;
        }[];
      };
      admin_upsert_bonus: {
        Args: {
          p_active: boolean;
          p_amount: number;
          p_expiry: string;
          p_id: string;
          p_max_users: number;
          p_name: string;
          p_wagering: number;
        };
        Returns: string;
      };
      apply_cluster: {
        Args: {
          p_child_schema: string;
          p_child_tablename: string;
          p_parent_schema: string;
          p_parent_tablename: string;
        };
        Returns: undefined;
      };
      apply_constraints: {
        Args: {
          p_analyze?: boolean;
          p_child_table?: string;
          p_job_id?: number;
          p_parent_table: string;
        };
        Returns: undefined;
      };
      apply_incoming_deposit_credit: {
        Args: { p_deposit_id: string };
        Returns: boolean;
      };
      apply_ledger_entry: {
        Args: {
          p_amount: number;
          p_description?: string;
          p_game_type?: string;
          p_idempotency_key: string;
          p_reference_id: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: number;
      };
      apply_privileges: {
        Args: {
          p_child_schema: string;
          p_child_tablename: string;
          p_job_id?: number;
          p_parent_schema: string;
          p_parent_tablename: string;
        };
        Returns: undefined;
      };
      auto_refill_if_empty: { Args: never; Returns: Json };
      autovacuum_off: {
        Args: {
          p_parent_schema: string;
          p_parent_tablename: string;
          p_source_schema?: string;
          p_source_tablename?: string;
        };
        Returns: boolean;
      };
      autovacuum_reset: {
        Args: {
          p_parent_schema: string;
          p_parent_tablename: string;
          p_source_schema?: string;
          p_source_tablename?: string;
        };
        Returns: boolean;
      };
      calculate_time_partition_info: {
        Args: {
          p_date_trunc_interval?: string;
          p_start_time: string;
          p_time_interval: string;
        };
        Returns: Record<string, unknown>;
      };
      cancel_payout_request: { Args: { p_id: string }; Returns: boolean };
      check_automatic_maintenance_value: {
        Args: { p_automatic_maintenance: string };
        Returns: boolean;
      };
      check_bet_rate_limit: { Args: { p_user_id: string }; Returns: boolean };
      check_control_type: {
        Args: {
          p_control: string;
          p_parent_schema: string;
          p_parent_tablename: string;
        };
        Returns: {
          exact_type: string;
          general_type: string;
        }[];
      };
      check_default: {
        Args: { p_exact_count?: boolean };
        Returns: Database["public"]["CompositeTypes"]["check_default_table"][];
        SetofOptions: {
          from: "*";
          to: "check_default_table";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      check_epoch_type: { Args: { p_type: string }; Returns: boolean };
      check_hot_wallet_alerts: {
        Args: never;
        Returns: {
          balance: number;
          chain: string;
          is_low: boolean;
          min_balance_alert: number;
        }[];
      };
      check_name_length: {
        Args: {
          p_object_name: string;
          p_suffix?: string;
          p_table_partition?: boolean;
        };
        Returns: string;
      };
      check_partition_type: { Args: { p_type: string }; Returns: boolean };
      check_rate_limit: {
        Args: {
          _action_type: string;
          _max_attempts?: number;
          _user_id: string;
          _window_minutes?: number;
        };
        Returns: boolean;
      };
      check_subpart_sameconfig: {
        Args: { p_parent_table: string };
        Returns: {
          sub_automatic_maintenance: string;
          sub_constraint_cols: string[];
          sub_constraint_valid: boolean;
          sub_control: string;
          sub_control_not_null: boolean;
          sub_date_trunc_interval: string;
          sub_default_table: boolean;
          sub_epoch: string;
          sub_ignore_default_data: boolean;
          sub_infinite_time_partitions: boolean;
          sub_inherit_privileges: boolean;
          sub_jobmon: boolean;
          sub_maintenance_order: number;
          sub_optimize_constraint: number;
          sub_partition_interval: string;
          sub_partition_type: string;
          sub_premake: number;
          sub_retention: string;
          sub_retention_keep_index: boolean;
          sub_retention_keep_publication: boolean;
          sub_retention_keep_table: boolean;
          sub_retention_schema: string;
          sub_template_table: string;
        }[];
      };
      check_subpartition_limits: {
        Args: { p_parent_table: string; p_type: string };
        Returns: Record<string, unknown>;
      };
      cleanup_expired_otps: { Args: never; Returns: undefined };
      create_parent: {
        Args: {
          p_automatic_maintenance?: string;
          p_constraint_cols?: string[];
          p_control: string;
          p_control_not_null?: boolean;
          p_date_trunc_interval?: string;
          p_default_table?: boolean;
          p_epoch?: string;
          p_interval: string;
          p_jobmon?: boolean;
          p_offset_id?: number;
          p_parent_table: string;
          p_premake?: number;
          p_start_partition?: string;
          p_template_table?: string;
          p_time_decoder?: string;
          p_time_encoder?: string;
          p_type?: string;
        };
        Returns: boolean;
      };
      create_partition_id: {
        Args: {
          p_parent_table: string;
          p_partition_ids: number[];
          p_start_partition?: string;
        };
        Returns: boolean;
      };
      create_partition_time: {
        Args: {
          p_parent_table: string;
          p_partition_times: string[];
          p_start_partition?: string;
        };
        Returns: boolean;
      };
      create_sub_parent: {
        Args: {
          p_constraint_cols?: string[];
          p_control: string;
          p_control_not_null?: boolean;
          p_date_trunc_interval?: string;
          p_declarative_check?: string;
          p_default_table?: boolean;
          p_epoch?: string;
          p_interval: string;
          p_jobmon?: boolean;
          p_premake?: number;
          p_start_partition?: string;
          p_time_decoder?: string;
          p_time_encoder?: string;
          p_top_parent: string;
          p_type?: string;
        };
        Returns: boolean;
      };
      credit_blockchain_deposit: {
        Args: {
          p_amount: number;
          p_from_address: string;
          p_to_address: string;
          p_tx_hash: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      drop_constraints: {
        Args: {
          p_child_table: string;
          p_debug?: boolean;
          p_parent_table: string;
        };
        Returns: undefined;
      };
      drop_partition_id: {
        Args: {
          p_keep_index?: boolean;
          p_keep_table?: boolean;
          p_parent_table: string;
          p_retention?: number;
          p_retention_schema?: string;
        };
        Returns: number;
      };
      drop_partition_time: {
        Args: {
          p_keep_index?: boolean;
          p_keep_table?: boolean;
          p_parent_table: string;
          p_reference_timestamp?: string;
          p_retention?: string;
          p_retention_schema?: string;
        };
        Returns: number;
      };
      dump_partitioned_table_definition: {
        Args: { p_ignore_template_table?: boolean; p_parent_table: string };
        Returns: string;
      };
      enqueue_email: {
        Args: { payload: Json; queue_name: string };
        Returns: undefined;
      };
      ensure_user_setup: { Args: { p_user_id: string }; Returns: undefined };
      function_name: { Args: never; Returns: undefined };
      get_active_game_session: {
        Args: { p_session_id: string };
        Returns: {
          bet_amount: number;
          client_seed: string;
          created_at: string;
          game_data: Json;
          game_type: string;
          id: string;
          multiplier: number;
          nonce: number;
          server_seed_hash: string;
          status: string;
        }[];
      };
      get_active_seed_info: {
        Args: never;
        Returns: {
          client_seed: string;
          nonce: number;
          server_seed_hash: string;
        }[];
      };
      get_casino_stats: {
        Args: never;
        Returns: {
          active_players: number;
          biggest_win: number;
          total_bets: number;
        }[];
      };
      get_crash_rounds_safe: {
        Args: { p_limit?: number };
        Returns: {
          crash_point: number;
          crashed_at: string;
          id: string;
          round_number: number;
          started_at: string;
          status: string;
        }[];
      };
      get_jackpot_stats: {
        Args: never;
        Returns: {
          bets_today: number;
          biggest_win: number;
          jackpot_pool: number;
          players_live: number;
        }[];
      };
      get_leaderboard: {
        Args: { p_limit?: number };
        Returns: {
          avatar_url: string;
          display_name: string;
          rank: number;
          total_bets: number;
          total_wagered: number;
          total_won: number;
          user_id: string;
          win_rate: number;
        }[];
      };
      get_monthly_leaderboard: {
        Args: never;
        Returns: {
          avatar_url: string;
          display_name: string;
          rank: number;
          total_bets: number;
          total_wagered: number;
          total_won: number;
          user_id: string;
          win_rate: number;
        }[];
      };
      get_my_leaderboard_rank: {
        Args: { _scope?: string };
        Returns: {
          rank: number;
          total_bets: number;
          total_wagered: number;
          total_won: number;
        }[];
      };
      get_my_weekly_rank: { Args: never; Returns: number };
      get_public_casino_config: { Args: never; Returns: Json };
      get_recent_jackpot_wins: {
        Args: { p_limit?: number };
        Returns: {
          amount: number;
          anonymous_id: string;
          created_at: string;
          game_type: string;
          id: string;
          tier: string;
        }[];
      };
      get_user_deposit_address: { Args: { p_user_id: string }; Returns: Json };
      get_user_withdrawal_summary: { Args: never; Returns: Json };
      get_weekly_leaderboard:
        | {
            Args: never;
            Returns: {
              avatar_url: string;
              display_name: string;
              rank: number;
              total_bets: number;
              total_wagered: number;
              total_won: number;
              user_id: string;
              win_rate: number;
            }[];
          }
        | {
            Args: { p_limit?: number };
            Returns: {
              game_count: number;
              rank: number;
              total_won: number;
              username: string;
            }[];
          };
      grant_daily_bonus: { Args: never; Returns: Json };
      grant_demo_credit_atomic: {
        Args: { p_amount: number; p_description?: string; p_user_id: string };
        Returns: {
          ledger_id: string;
          new_balance: number;
          old_balance: number;
        }[];
      };
      grant_signup_bonus: { Args: { p_user_id: string }; Returns: number };
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean };
      increment_jackpots: {
        Args: { p_bet_amount: number };
        Returns: undefined;
      };
      inherit_replica_identity: {
        Args: {
          p_child_tablename: string;
          p_parent_schemaname: string;
          p_parent_tablename: string;
        };
        Returns: undefined;
      };
      inherit_template_properties: {
        Args: {
          p_child_schema: string;
          p_child_tablename: string;
          p_parent_table: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { p_user_id?: string }; Returns: boolean };
      is_platform_mode: { Args: { p_mode: string }; Returns: boolean };
      issue_email_otp: {
        Args: { p_email: string; p_ttl_minutes?: number };
        Returns: string;
      };
      log_audit_event:
        | {
            Args: {
              _event_details?: Json;
              _event_type: string;
              _user_agent?: string;
              _user_id: string;
            };
            Returns: undefined;
          }
        | {
            Args: {
              p_action: string;
              p_details?: Json;
              p_entity_id?: string;
              p_entity_type: string;
              p_user_id: string;
            };
            Returns: undefined;
          };
      owner_withdrawal_mark_completed: {
        Args: {
          p_sent_at?: string;
          p_tx_hash: string;
          p_withdrawal_id: string;
        };
        Returns: Json;
      };
      owner_withdrawal_mark_processing: {
        Args: { p_from_wallet?: string; p_withdrawal_id: string };
        Returns: Json;
      };
      partition_data_id: {
        Args: {
          p_analyze?: boolean;
          p_batch_count?: number;
          p_batch_interval?: number;
          p_ignored_columns?: string[];
          p_lock_wait?: number;
          p_order?: string;
          p_override_system_value?: boolean;
          p_parent_table: string;
          p_source_table?: string;
        };
        Returns: number;
      };
      partition_data_time: {
        Args: {
          p_analyze?: boolean;
          p_batch_count?: number;
          p_batch_interval?: string;
          p_ignored_columns?: string[];
          p_lock_wait?: number;
          p_order?: string;
          p_override_system_value?: boolean;
          p_parent_table: string;
          p_source_table?: string;
        };
        Returns: number;
      };
      partition_gap_fill: { Args: { p_parent_table: string }; Returns: number };
      process_pending_incoming_deposits: {
        Args: { p_limit?: number };
        Returns: number;
      };
      process_support_triage_jobs: {
        Args: { batch_size?: number; vt_seconds?: number };
        Returns: undefined;
      };
      process_withdrawal_request: {
        Args: { p_amount: number; p_user_id: string; p_wallet_address: string };
        Returns: Json;
      };
      reapply_privileges: {
        Args: { p_parent_table: string };
        Returns: undefined;
      };
      reserve_fair_seed_nonce: {
        Args: { p_user_id: string };
        Returns: {
          client_seed: string;
          reserved_nonce: number;
          seed_id: string;
          server_seed: string;
          server_seed_hash: string;
        }[];
      };
      resolve_unmatched_paypal_payment: {
        Args: { p_notes?: string; p_payment_id: string; p_user_id: string };
        Returns: boolean;
      };
      rpc_assert_breaker_closed: {
        Args: { p_scope: string };
        Returns: undefined;
      };
      rpc_auto_reset_due_breakers: { Args: never; Returns: number };
      rpc_compute_withdrawable: { Args: { p_user_id: string }; Returns: Json };
      rpc_trip_breaker: {
        Args: {
          p_auto_reset_minutes?: number;
          p_metadata?: Json;
          p_reason: string;
          p_scope: string;
        };
        Returns: undefined;
      };
      run_maintenance: {
        Args: {
          p_analyze?: boolean;
          p_jobmon?: boolean;
          p_parent_table?: string;
        };
        Returns: undefined;
      };
      show_partition_info: {
        Args: {
          p_child_table: string;
          p_parent_table?: string;
          p_partition_interval?: string;
          p_table_exists?: boolean;
        };
        Returns: Record<string, unknown>;
      };
      show_partition_name: {
        Args: { p_parent_table: string; p_value: string };
        Returns: Record<string, unknown>;
      };
      show_partitions: {
        Args: {
          p_include_default?: boolean;
          p_order?: string;
          p_parent_table: string;
        };
        Returns: {
          partition_schemaname: string;
          partition_tablename: string;
        }[];
      };
      stop_sub_partition: {
        Args: { p_jobmon?: boolean; p_parent_table: string };
        Returns: boolean;
      };
      take_daily_wallet_snapshots: { Args: never; Returns: undefined };
      undo_partition: {
        Args: {
          p_batch_interval?: string;
          p_drop_cascade?: boolean;
          p_ignored_columns?: string[];
          p_keep_table?: boolean;
          p_lock_wait?: number;
          p_loop_count?: number;
          p_parent_table: string;
          p_target_table: string;
        };
        Returns: Record<string, unknown>;
      };
      update_casino_balance: {
        Args: {
          p_amount: number;
          p_description?: string;
          p_reference_id?: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: number;
      };
      update_jackpots_on_bet: {
        Args: { p_bet_amount: number };
        Returns: undefined;
      };
      uuid7_time_decoder: { Args: { uuidv7: string }; Returns: string };
      uuid7_time_encoder: { Args: { ts: string }; Returns: string };
      validate_admin_pin_session: {
        Args: { p_token: string };
        Returns: boolean;
      };
      verify_email_otp: {
        Args: { p_code: string; p_email: string };
        Returns: boolean;
      };
      verify_pin_hash: {
        Args: { _hash: string; _pin: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      check_default_table: {
        default_table: string | null;
        count: number | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
