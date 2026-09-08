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
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_by: string | null
          created_date: string
          id: string
          key: string
          updated_date: string
          value: string
        }
        Insert: {
          created_by?: string | null
          created_date?: string
          id?: string
          key: string
          updated_date?: string
          value: string
        }
        Update: {
          created_by?: string | null
          created_date?: string
          id?: string
          key?: string
          updated_date?: string
          value?: string
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          amount: number
          category: string | null
          created_by: string | null
          created_date: string
          date: string | null
          description: string | null
          id: string
          party_name: string | null
          shop_id: string | null
          time: string | null
          transaction_id: string | null
          type: string
          updated_date: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_by?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          id?: string
          party_name?: string | null
          shop_id?: string | null
          time?: string | null
          transaction_id?: string | null
          type: string
          updated_date?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_by?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          id?: string
          party_name?: string | null
          shop_id?: string | null
          time?: string | null
          transaction_id?: string | null
          type?: string
          updated_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      email_confirmation_challenges: {
        Row: {
          confirmed_at: string | null
          created_at: string
          expires_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          code: string
          created_by: string | null
          created_date: string
          id: string
          is_used: boolean
          package_type: string
          updated_date: string
          used_by_email: string | null
          used_date: string | null
        }
        Insert: {
          code: string
          created_by?: string | null
          created_date?: string
          id?: string
          is_used?: boolean
          package_type: string
          updated_date?: string
          used_by_email?: string | null
          used_date?: string | null
        }
        Update: {
          code?: string
          created_by?: string | null
          created_date?: string
          id?: string
          is_used?: boolean
          package_type?: string
          updated_date?: string
          used_by_email?: string | null
          used_date?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          address: string | null
          avatar_color: string | null
          created_by: string | null
          created_date: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          shop_id: string | null
          total_credit: number
          total_debit: number
          type: string
          updated_date: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_color?: string | null
          created_by?: string | null
          created_date?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          shop_id?: string | null
          total_credit?: number
          total_debit?: number
          type?: string
          updated_date?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          avatar_color?: string | null
          created_by?: string | null
          created_date?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          shop_id?: string | null
          total_credit?: number
          total_debit?: number
          type?: string
          updated_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          created_by: string | null
          created_date: string
          description: string | null
          discount: boolean | null
          discount_amount: number | null
          discount_type: string | null
          id: string
          low_stock_alert: boolean | null
          min_stock_level: number | null
          name: string
          online_sale: boolean | null
          photo_url: string | null
          purchase_price: number | null
          sale_price: number | null
          shop_id: string | null
          stock: number | null
          sub_category: string | null
          unit: string | null
          updated_date: string
          user_id: string
          vat_applicable: boolean | null
          vat_percent: number | null
          warranty: boolean | null
          warranty_duration: number | null
          warranty_unit: string | null
          wholesale: boolean | null
          wholesale_min_qty: number | null
          wholesale_price: number | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_by?: string | null
          created_date?: string
          description?: string | null
          discount?: boolean | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          low_stock_alert?: boolean | null
          min_stock_level?: number | null
          name: string
          online_sale?: boolean | null
          photo_url?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          shop_id?: string | null
          stock?: number | null
          sub_category?: string | null
          unit?: string | null
          updated_date?: string
          user_id?: string
          vat_applicable?: boolean | null
          vat_percent?: number | null
          warranty?: boolean | null
          warranty_duration?: number | null
          warranty_unit?: string | null
          wholesale?: boolean | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_by?: string | null
          created_date?: string
          description?: string | null
          discount?: boolean | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          low_stock_alert?: boolean | null
          min_stock_level?: number | null
          name?: string
          online_sale?: boolean | null
          photo_url?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          shop_id?: string | null
          stock?: number | null
          sub_category?: string | null
          unit?: string | null
          updated_date?: string
          user_id?: string
          vat_applicable?: boolean | null
          vat_percent?: number | null
          warranty?: boolean | null
          warranty_duration?: number | null
          warranty_unit?: string | null
          wholesale?: boolean | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          activation_code: string | null
          activation_code_1y: string | null
          activation_code_3m: string | null
          activation_code_6m: string | null
          activation_code_lifetime: string | null
          activation_code_shop: string | null
          activation_end_date: string | null
          created_date: string
          email: string | null
          full_name: string | null
          id: string
          is_activated: boolean
          language: string
          last_active: string | null
          mobile_number: string | null
          package_type: string | null
          pre_admin_state: Json | null
          shop_create_credits: number
          trial_end_date: string | null
          updated_date: string
          username: string | null
        }
        Insert: {
          account_status?: string
          activation_code?: string | null
          activation_code_1y?: string | null
          activation_code_3m?: string | null
          activation_code_6m?: string | null
          activation_code_lifetime?: string | null
          activation_code_shop?: string | null
          activation_end_date?: string | null
          created_date?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_activated?: boolean
          language?: string
          last_active?: string | null
          mobile_number?: string | null
          package_type?: string | null
          pre_admin_state?: Json | null
          shop_create_credits?: number
          trial_end_date?: string | null
          updated_date?: string
          username?: string | null
        }
        Update: {
          account_status?: string
          activation_code?: string | null
          activation_code_1y?: string | null
          activation_code_3m?: string | null
          activation_code_6m?: string | null
          activation_code_lifetime?: string | null
          activation_code_shop?: string | null
          activation_end_date?: string | null
          created_date?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_activated?: boolean
          language?: string
          last_active?: string | null
          mobile_number?: string | null
          package_type?: string | null
          pre_admin_state?: Json | null
          shop_create_credits?: number
          trial_end_date?: string | null
          updated_date?: string
          username?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_by: string | null
          created_date: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_charge: number
          discount: number
          due: number
          employee_name: string | null
          employee_phone: string | null
          id: string
          item_count: number
          items: Json
          items_summary: string | null
          note: string | null
          paid: number
          payment_method: string
          photo_url: string | null
          profit: number | null
          receipt_no: string
          sale_date: string
          sale_type: string
          shop_id: string | null
          subtotal: number
          total: number
          updated_date: string
          user_id: string
        }
        Insert: {
          created_by?: string | null
          created_date?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_charge?: number
          discount?: number
          due?: number
          employee_name?: string | null
          employee_phone?: string | null
          id?: string
          item_count?: number
          items?: Json
          items_summary?: string | null
          note?: string | null
          paid?: number
          payment_method?: string
          photo_url?: string | null
          profit?: number | null
          receipt_no: string
          sale_date?: string
          sale_type?: string
          shop_id?: string | null
          subtotal?: number
          total?: number
          updated_date?: string
          user_id?: string
        }
        Update: {
          created_by?: string | null
          created_date?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_charge?: number
          discount?: number
          due?: number
          employee_name?: string | null
          employee_phone?: string | null
          id?: string
          item_count?: number
          items?: Json
          items_summary?: string | null
          note?: string | null
          paid?: number
          payment_method?: string
          photo_url?: string | null
          profit?: number | null
          receipt_no?: string
          sale_date?: string
          sale_type?: string
          shop_id?: string | null
          subtotal?: number
          total?: number
          updated_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          area: string | null
          created_date: string
          district: string | null
          division: string | null
          id: string
          logo_url: string | null
          name: string
          online_sale: boolean
          owner_name: string | null
          owner_phone: string | null
          shop_type: string | null
          updated_date: string
          user_id: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          created_date?: string
          district?: string | null
          division?: string | null
          id?: string
          logo_url?: string | null
          name: string
          online_sale?: boolean
          owner_name?: string | null
          owner_phone?: string | null
          shop_type?: string | null
          updated_date?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          created_date?: string
          district?: string | null
          division?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          online_sale?: boolean
          owner_name?: string | null
          owner_phone?: string | null
          shop_type?: string | null
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
      sub_categories: {
        Row: {
          category: string | null
          created_by: string | null
          created_date: string
          id: string
          name: string
          shop_id: string | null
          updated_date: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_by?: string | null
          created_date?: string
          id?: string
          name: string
          shop_id?: string | null
          updated_date?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          created_by?: string | null
          created_date?: string
          id?: string
          name?: string
          shop_id?: string | null
          updated_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string | null
          created_by: string | null
          created_date: string
          date: string | null
          description: string | null
          id: string
          party_id: string | null
          party_name: string | null
          shop_id: string | null
          time: string | null
          type: string
          updated_date: string
          user_id: string
        }
        Insert: {
          amount?: number
          attachment_url?: string | null
          category?: string | null
          created_by?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          id?: string
          party_id?: string | null
          party_name?: string | null
          shop_id?: string | null
          time?: string | null
          type: string
          updated_date?: string
          user_id?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string | null
          created_by?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          id?: string
          party_id?: string | null
          party_name?: string | null
          shop_id?: string | null
          time?: string | null
          type?: string
          updated_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_activation_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_main_admin: { Args: { _user_id: string }; Returns: boolean }
      main_admin_email: { Args: never; Returns: string }
      redeem_package: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
