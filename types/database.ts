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
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      activity: {
        Row: {
          batch_id: string | null
          color: string | null
          created_at: string | null
          id: string
          sub: string | null
          text: string
          time_label: string | null
        }
        Insert: {
          batch_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          sub?: string | null
          text: string
          time_label?: string | null
        }
        Update: {
          batch_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          sub?: string | null
          text?: string
          time_label?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          entity_id: string
          entity_type: string
          event_id: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          occurred_at: string
          organization_id: string
          summary: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          entity_id: string
          entity_type: string
          event_id: string
          event_type: string
          id: string
          ip_address?: string | null
          metadata?: Json
          occurred_at?: string
          organization_id: string
          summary: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          entity_id?: string
          entity_type?: string
          event_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          occurred_at?: string
          organization_id?: string
          summary?: string
        }
        Relationships: []
      }
      batch_losses: {
        Row: {
          batch_id: string
          id: string
          liters_lost: number
          loss_type: Database["public"]["Enums"]["LossType"]
          metadata: Json
          reason: string | null
          recorded_at: string
          recorded_by: string
        }
        Insert: {
          batch_id: string
          id: string
          liters_lost: number
          loss_type: Database["public"]["Enums"]["LossType"]
          metadata?: Json
          reason?: string | null
          recorded_at?: string
          recorded_by: string
        }
        Update: {
          batch_id?: string
          id?: string
          liters_lost?: number
          loss_type?: Database["public"]["Enums"]["LossType"]
          metadata?: Json
          reason?: string | null
          recorded_at?: string
          recorded_by?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          alert: string | null
          clerk_id: string | null
          created_at: string | null
          day: number | null
          density: number | null
          id: string
          name: string
          ph: number | null
          profile_type_v2: string | null
          progress: number | null
          status: string | null
          temp: number | null
          type: string
          updated_at: string | null
          volume: number
          yeast: string | null
        }
        Insert: {
          alert?: string | null
          clerk_id?: string | null
          created_at?: string | null
          day?: number | null
          density?: number | null
          id: string
          name: string
          ph?: number | null
          profile_type_v2?: string | null
          progress?: number | null
          status?: string | null
          temp?: number | null
          type: string
          updated_at?: string | null
          volume?: number
          yeast?: string | null
        }
        Update: {
          alert?: string | null
          clerk_id?: string | null
          created_at?: string | null
          day?: number | null
          density?: number | null
          id?: string
          name?: string
          ph?: number | null
          profile_type_v2?: string | null
          progress?: number | null
          status?: string | null
          temp?: number | null
          type?: string
          updated_at?: string | null
          volume?: number
          yeast?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          area_ha: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          planted_year: number | null
          varietal_id: string | null
          vineyard_id: string
        }
        Insert: {
          area_ha?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          planted_year?: number | null
          varietal_id?: string | null
          vineyard_id: string
        }
        Update: {
          area_ha?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          planted_year?: number | null
          varietal_id?: string | null
          vineyard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_varietal_id_fkey"
            columns: ["varietal_id"]
            isOneToOne: false
            referencedRelation: "varietals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_vineyard_id_fkey"
            columns: ["vineyard_id"]
            isOneToOne: false
            referencedRelation: "vineyards"
            referencedColumns: ["id"]
          },
        ]
      }
      bodegas: {
        Row: {
          ciudad: string
          clerk_id: string
          created_at: string
          es_embotellado: boolean
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["dest_bodega_tipo"]
          updated_at: string
        }
        Insert: {
          ciudad?: string
          clerk_id: string
          created_at?: string
          es_embotellado?: boolean
          id?: string
          nombre: string
          tipo?: Database["public"]["Enums"]["dest_bodega_tipo"]
          updated_at?: string
        }
        Update: {
          ciudad?: string
          clerk_id?: string
          created_at?: string
          es_embotellado?: boolean
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["dest_bodega_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      botellas: {
        Row: {
          caja_id: string
          clerk_id: string
          codigo_qr: string
          created_at: string
          estado: Database["public"]["Enums"]["dest_botella_estado"]
          id: string
          lote_id: string
        }
        Insert: {
          caja_id: string
          clerk_id: string
          codigo_qr: string
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_botella_estado"]
          id?: string
          lote_id: string
        }
        Update: {
          caja_id?: string
          clerk_id?: string
          codigo_qr?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_botella_estado"]
          id?: string
          lote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "botellas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "botellas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      bottling: {
        Row: {
          batch_id: string | null
          bottles_cost: number | null
          bottles_qty: number | null
          bottling_date: string | null
          boxes_cost: number | null
          boxes_qty: number | null
          cans_cost: number | null
          cans_qty: number | null
          caps_cost: number | null
          caps_qty: number | null
          capsules_cost: number | null
          capsules_qty: number | null
          clerk_id: string
          corks_cost: number | null
          corks_qty: number | null
          created_at: string | null
          id: string
          labels_cost: number | null
          labels_qty: number | null
          notes: string | null
          total_units: number | null
          unit_type: string | null
        }
        Insert: {
          batch_id?: string | null
          bottles_cost?: number | null
          bottles_qty?: number | null
          bottling_date?: string | null
          boxes_cost?: number | null
          boxes_qty?: number | null
          cans_cost?: number | null
          cans_qty?: number | null
          caps_cost?: number | null
          caps_qty?: number | null
          capsules_cost?: number | null
          capsules_qty?: number | null
          clerk_id: string
          corks_cost?: number | null
          corks_qty?: number | null
          created_at?: string | null
          id?: string
          labels_cost?: number | null
          labels_qty?: number | null
          notes?: string | null
          total_units?: number | null
          unit_type?: string | null
        }
        Update: {
          batch_id?: string | null
          bottles_cost?: number | null
          bottles_qty?: number | null
          bottling_date?: string | null
          boxes_cost?: number | null
          boxes_qty?: number | null
          cans_cost?: number | null
          cans_qty?: number | null
          caps_cost?: number | null
          caps_qty?: number | null
          capsules_cost?: number | null
          capsules_qty?: number | null
          clerk_id?: string
          corks_cost?: number | null
          corks_qty?: number | null
          created_at?: string | null
          id?: string
          labels_cost?: number | null
          labels_qty?: number | null
          notes?: string | null
          total_units?: number | null
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bottling_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas: {
        Row: {
          bodega_id: string
          cantidad_botellas: number
          clerk_id: string
          codigo_qr: string
          corrida_id: string
          created_at: string
          estado: Database["public"]["Enums"]["dest_caja_estado"]
          formato_botella: Database["public"]["Enums"]["dest_formato_botella"]
          id: string
          lote_id: string
          timestamp_entrada: string
        }
        Insert: {
          bodega_id: string
          cantidad_botellas?: number
          clerk_id: string
          codigo_qr: string
          corrida_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_caja_estado"]
          formato_botella: Database["public"]["Enums"]["dest_formato_botella"]
          id?: string
          lote_id: string
          timestamp_entrada?: string
        }
        Update: {
          bodega_id?: string
          cantidad_botellas?: number
          clerk_id?: string
          codigo_qr?: string
          corrida_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_caja_estado"]
          formato_botella?: Database["public"]["Enums"]["dest_formato_botella"]
          id?: string
          lote_id?: string
          timestamp_entrada?: string
        }
        Relationships: [
          {
            foreignKeyName: "cajas_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas_embotellado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas_distribuidor: {
        Row: {
          created_at: string
          estado: string
          id: string
          oc_id: string | null
          profile_type_v2: string
          qr_code: string
          sku_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          oc_id?: string | null
          profile_type_v2?: string
          qr_code: string
          sku_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          oc_id?: string | null
          profile_type_v2?: string
          qr_code?: string
          sku_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cajas_distribuidor_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_distribuidor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_distribuidor_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      client_etiquetas: {
        Row: {
          client_id: string
          created_at: string
          id: string
          nombre: string
          profile_type_v2: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          nombre: string
          profile_type_v2?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          nombre?: string
          profile_type_v2?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_etiquetas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          dias_credito: number
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          profile_type_v2: string
          telefono: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          dias_credito?: number
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          profile_type_v2?: string
          telefono?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          dias_credito?: number
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          profile_type_v2?: string
          telefono?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          contact: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          price_tier: string | null
          profile_type_v2: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          price_tier?: string | null
          profile_type_v2?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          price_tier?: string | null
          profile_type_v2?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      corridas_embotellado: {
        Row: {
          bodega_id: string
          botellas_defectuosas: number
          botellas_producidas: number
          cajas_confirmadas: number | null
          cajas_contadas_vision: number | null
          clerk_id: string
          costo_corrida: number | null
          costo_real_por_botella: number | null
          created_at: string
          estado: Database["public"]["Enums"]["dest_corrida_estado"]
          fecha_embotellado: string | null
          formato_botella: Database["public"]["Enums"]["dest_formato_botella"]
          foto_lote_url: string | null
          horas_estimadas: number | null
          horas_reales: number | null
          id: string
          litros_asignados: number
          litros_usados: number | null
          lote_id: string
          merma_litros: number | null
          merma_porcentaje: number | null
          modo: Database["public"]["Enums"]["dest_corrida_modo"]
          personas: number | null
          tarifa_hora: number | null
          updated_at: string
        }
        Insert: {
          bodega_id: string
          botellas_defectuosas?: number
          botellas_producidas?: number
          cajas_confirmadas?: number | null
          cajas_contadas_vision?: number | null
          clerk_id: string
          costo_corrida?: number | null
          costo_real_por_botella?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_corrida_estado"]
          fecha_embotellado?: string | null
          formato_botella: Database["public"]["Enums"]["dest_formato_botella"]
          foto_lote_url?: string | null
          horas_estimadas?: number | null
          horas_reales?: number | null
          id?: string
          litros_asignados: number
          litros_usados?: number | null
          lote_id: string
          merma_litros?: number | null
          merma_porcentaje?: number | null
          modo: Database["public"]["Enums"]["dest_corrida_modo"]
          personas?: number | null
          tarifa_hora?: number | null
          updated_at?: string
        }
        Update: {
          bodega_id?: string
          botellas_defectuosas?: number
          botellas_producidas?: number
          cajas_confirmadas?: number | null
          cajas_contadas_vision?: number | null
          clerk_id?: string
          costo_corrida?: number | null
          costo_real_por_botella?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_corrida_estado"]
          fecha_embotellado?: string | null
          formato_botella?: Database["public"]["Enums"]["dest_formato_botella"]
          foto_lote_url?: string | null
          horas_estimadas?: number | null
          horas_reales?: number | null
          id?: string
          litros_asignados?: number
          litros_usados?: number | null
          lote_id?: string
          merma_litros?: number | null
          merma_porcentaje?: number | null
          modo?: Database["public"]["Enums"]["dest_corrida_modo"]
          personas?: number | null
          tarifa_hora?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corridas_embotellado_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_embotellado_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          batch_id: string | null
          category: string
          clerk_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          category: string
          clerk_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          category?: string
          clerk_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "costs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          dias_vencido: number
          estado: Database["public"]["Enums"]["estado_cuenta_cliente"]
          fecha_ultima_factura: string | null
          fecha_vencimiento: string | null
          id: string
          pedido_activo_hoy: boolean
          pedidos_asociados: string[]
          profile_type_v2: string
          saldo_pendiente: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dias_vencido?: number
          estado?: Database["public"]["Enums"]["estado_cuenta_cliente"]
          fecha_ultima_factura?: string | null
          fecha_vencimiento?: string | null
          id?: string
          pedido_activo_hoy?: boolean
          pedidos_asociados?: string[]
          profile_type_v2?: string
          saldo_pendiente?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dias_vencido?: number
          estado?: Database["public"]["Enums"]["estado_cuenta_cliente"]
          fecha_ultima_factura?: string | null
          fecha_vencimiento?: string | null
          id?: string
          pedido_activo_hoy?: boolean
          pedidos_asociados?: string[]
          profile_type_v2?: string
          saldo_pendiente?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_por_cobrar: {
        Row: {
          cliente_nombre: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta_por_cobrar"]
          fecha_vencimiento: string | null
          id: string
          monto_pagado: number
          monto_total: number
          pedido_id: string
          profile_type_v2: string
          saldo_pendiente: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_nombre?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuenta_por_cobrar"]
          fecha_vencimiento?: string | null
          id?: string
          monto_pagado?: number
          monto_total: number
          pedido_id: string
          profile_type_v2?: string
          saldo_pendiente?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_nombre?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuenta_por_cobrar"]
          fecha_vencimiento?: string | null
          id?: string
          monto_pagado?: number
          monto_total?: number
          pedido_id?: string
          profile_type_v2?: string
          saldo_pendiente?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_cobrar_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_por_pagar: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta_por_pagar"]
          fecha_vencimiento: string | null
          id: string
          monto_pagado: number
          monto_total: number
          orden_compra_id: string
          profile_type_v2: string
          proveedor_nombre: string
          saldo_pendiente: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuenta_por_pagar"]
          fecha_vencimiento?: string | null
          id?: string
          monto_pagado?: number
          monto_total: number
          orden_compra_id: string
          profile_type_v2?: string
          proveedor_nombre?: string
          saldo_pendiente?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuenta_por_pagar"]
          fecha_vencimiento?: string | null
          id?: string
          monto_pagado?: number
          monto_total?: number
          orden_compra_id?: string
          profile_type_v2?: string
          proveedor_nombre?: string
          saldo_pendiente?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: true
            referencedRelation: "ordenes_compra_distribuidor"
            referencedColumns: ["id"]
          },
        ]
      }
      destilador_sequences: {
        Row: {
          clerk_id: string
          lote_seq: number
          pedido_seq: number
          updated_at: string
        }
        Insert: {
          clerk_id: string
          lote_seq?: number
          pedido_seq?: number
          updated_at?: string
        }
        Update: {
          clerk_id?: string
          lote_seq?: number
          pedido_seq?: number
          updated_at?: string
        }
        Relationships: []
      }
      deudas_productores: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_deuda_productor"]
          fecha_vencimiento: string
          id: string
          monto: number
          notas: string | null
          productor: string
          profile_type_v2: string
          skus_asociados: string[]
          tipo: Database["public"]["Enums"]["tipo_deuda_productor"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_deuda_productor"]
          fecha_vencimiento: string
          id?: string
          monto: number
          notas?: string | null
          productor: string
          profile_type_v2?: string
          skus_asociados?: string[]
          tipo?: Database["public"]["Enums"]["tipo_deuda_productor"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_deuda_productor"]
          fecha_vencimiento?: string
          id?: string
          monto?: number
          notas?: string | null
          productor?: string
          profile_type_v2?: string
          skus_asociados?: string[]
          tipo?: Database["public"]["Enums"]["tipo_deuda_productor"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discrepancias: {
        Row: {
          cantidad_afectada: number
          created_at: string
          descripcion: string
          id: string
          recepcion_id: string
          sku_id: string | null
          tipo: Database["public"]["Enums"]["tipo_discrepancia"]
        }
        Insert: {
          cantidad_afectada?: number
          created_at?: string
          descripcion?: string
          id?: string
          recepcion_id: string
          sku_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_discrepancia"]
        }
        Update: {
          cantidad_afectada?: number
          created_at?: string
          descripcion?: string
          id?: string
          recepcion_id?: string
          sku_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_discrepancia"]
        }
        Relationships: [
          {
            foreignKeyName: "discrepancias_recepcion_id_fkey"
            columns: ["recepcion_id"]
            isOneToOne: false
            referencedRelation: "recepciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discrepancias_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          actor_id: string | null
          aggregate_id: string
          aggregate_type: string
          causation_id: string | null
          correlation_id: string | null
          event_type: string
          id: string
          occurred_at: string
          organization_id: string
          payload: Json
          sequence: number
        }
        Insert: {
          actor_id?: string | null
          aggregate_id: string
          aggregate_type: string
          causation_id?: string | null
          correlation_id?: string | null
          event_type: string
          id: string
          occurred_at?: string
          organization_id: string
          payload?: Json
          sequence: number
        }
        Update: {
          actor_id?: string | null
          aggregate_id?: string
          aggregate_type?: string
          causation_id?: string | null
          correlation_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          payload?: Json
          sequence?: number
        }
        Relationships: []
      }
      eventos_caja: {
        Row: {
          caja_id: string
          created_at: string
          id: string
          pedido_id: string | null
          tipo: string
          trabajador_id: string
        }
        Insert: {
          caja_id: string
          created_at?: string
          id?: string
          pedido_id?: string | null
          tipo: string
          trabajador_id: string
        }
        Update: {
          caja_id?: string
          created_at?: string
          id?: string
          pedido_id?: string | null
          tipo?: string
          trabajador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas_distribuidor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_caja_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_caja_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          evidence_ids: string[]
          id: string
          lot_id: string | null
          occurred_at: string
          organization_id: string
          payload: Json
          recorded_at: string
          vineyard_id: string | null
          vintage_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          evidence_ids?: string[]
          id?: string
          lot_id?: string | null
          occurred_at: string
          organization_id: string
          payload?: Json
          recorded_at?: string
          vineyard_id?: string | null
          vintage_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          evidence_ids?: string[]
          id?: string
          lot_id?: string | null
          occurred_at?: string
          organization_id?: string
          payload?: Json
          recorded_at?: string
          vineyard_id?: string | null
          vintage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_vineyard_id_fkey"
            columns: ["vineyard_id"]
            isOneToOne: false
            referencedRelation: "vineyards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
      expresiones_producto: {
        Row: {
          clerk_id: string
          collarin_id: string | null
          contraetiqueta_id: string | null
          created_at: string
          etiqueta_frontal_id: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          clerk_id: string
          collarin_id?: string | null
          contraetiqueta_id?: string | null
          created_at?: string
          etiqueta_frontal_id?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          clerk_id?: string
          collarin_id?: string | null
          contraetiqueta_id?: string | null
          created_at?: string
          etiqueta_frontal_id?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expresiones_collarin_fk"
            columns: ["collarin_id"]
            isOneToOne: false
            referencedRelation: "stock_etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expresiones_contraetiqueta_fk"
            columns: ["contraetiqueta_id"]
            isOneToOne: false
            referencedRelation: "stock_etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expresiones_etiqueta_frontal_fk"
            columns: ["etiqueta_frontal_id"]
            isOneToOne: false
            referencedRelation: "stock_etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_goods: {
        Row: {
          batch_id: string
          bottled_at: string
          bottles: number
          cases: number
          id: string
          sku_id: string
        }
        Insert: {
          batch_id: string
          bottled_at?: string
          bottles?: number
          cases?: number
          id: string
          sku_id: string
        }
        Update: {
          batch_id?: string
          bottled_at?: string
          bottles?: number
          cases?: number
          id?: string
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finished_goods_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus_legacy_prisma"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_cuts: {
        Row: {
          block_id: string | null
          created_at: string
          cut_date: string
          cut_number: number
          id: string
          intended_style: string
          notes: string | null
          organization_id: string
          varietal_id: string | null
          vineyard_id: string | null
          vintage_id: string
          weight_kg: number | null
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          cut_date: string
          cut_number?: number
          id?: string
          intended_style: string
          notes?: string | null
          organization_id: string
          varietal_id?: string | null
          vineyard_id?: string | null
          vintage_id: string
          weight_kg?: number | null
        }
        Update: {
          block_id?: string | null
          created_at?: string
          cut_date?: string
          cut_number?: number
          id?: string
          intended_style?: string
          notes?: string | null
          organization_id?: string
          varietal_id?: string | null
          vineyard_id?: string | null
          vintage_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_cuts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_cuts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_cuts_varietal_id_fkey"
            columns: ["varietal_id"]
            isOneToOne: false
            referencedRelation: "varietals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_cuts_vineyard_id_fkey"
            columns: ["vineyard_id"]
            isOneToOne: false
            referencedRelation: "vineyards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_cuts_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          batch_id: string | null
          clerk_id: string
          created_at: string | null
          id: string
          notes: string | null
          product_name: string
          product_type: string | null
          quantity: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          clerk_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_name: string
          product_type?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          clerk_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_name?: string
          product_type?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      items_orden_compra: {
        Row: {
          cantidad_esperada: number
          created_at: string
          id: string
          orden_compra_id: string
          precio_unitario: number
          sku_id: string
        }
        Insert: {
          cantidad_esperada: number
          created_at?: string
          id?: string
          orden_compra_id: string
          precio_unitario?: number
          sku_id: string
        }
        Update: {
          cantidad_esperada?: number
          created_at?: string
          id?: string
          orden_compra_id?: string
          precio_unitario?: number
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_orden_compra_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_orden_compra_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      items_orden_compra_distribuidor: {
        Row: {
          cantidad_ordenada: number
          cantidad_recibida: number | null
          costo_unitario: number
          created_at: string
          id: string
          orden_id: string
          producto_nombre: string
          sku_id: string | null
          subtotal: number | null
        }
        Insert: {
          cantidad_ordenada: number
          cantidad_recibida?: number | null
          costo_unitario?: number
          created_at?: string
          id?: string
          orden_id: string
          producto_nombre: string
          sku_id?: string | null
          subtotal?: number | null
        }
        Update: {
          cantidad_ordenada?: number
          cantidad_recibida?: number | null
          costo_unitario?: number
          created_at?: string
          id?: string
          orden_id?: string
          producto_nombre?: string
          sku_id?: string | null
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_orden_compra_distribuidor_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_distribuidor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_orden_compra_distribuidor_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      items_pedido: {
        Row: {
          cantidad: number
          created_at: string
          disponible_al_crear: number
          id: string
          nombre: string
          pedido_id: string
          precio_unitario: number
          sku_id: string
          subtotal: number
          unidad: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          disponible_al_crear?: number
          id?: string
          nombre: string
          pedido_id: string
          precio_unitario?: number
          sku_id: string
          subtotal?: number
          unidad?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          disponible_al_crear?: number
          id?: string
          nombre?: string
          pedido_id?: string
          precio_unitario?: number
          sku_id?: string
          subtotal?: number
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_pedido_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      items_pedido_destilador: {
        Row: {
          cantidad: number
          clerk_id: string
          created_at: string
          formato: Database["public"]["Enums"]["dest_formato_botella"] | null
          id: string
          lote_id: string
          pedido_id: string
          precio_unitario: number
          subtotal: number | null
          tipo: Database["public"]["Enums"]["dest_item_tipo"]
        }
        Insert: {
          cantidad: number
          clerk_id: string
          created_at?: string
          formato?: Database["public"]["Enums"]["dest_formato_botella"] | null
          id?: string
          lote_id: string
          pedido_id: string
          precio_unitario: number
          subtotal?: number | null
          tipo: Database["public"]["Enums"]["dest_item_tipo"]
        }
        Update: {
          cantidad?: number
          clerk_id?: string
          created_at?: string
          formato?: Database["public"]["Enums"]["dest_formato_botella"] | null
          id?: string
          lote_id?: string
          pedido_id?: string
          precio_unitario?: number
          subtotal?: number | null
          tipo?: Database["public"]["Enums"]["dest_item_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "items_pedido_destilador_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_pedido_destilador_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_destilador"
            referencedColumns: ["id"]
          },
        ]
      }
      items_recepcion: {
        Row: {
          cantidad_esperada: number
          cantidad_recibida: number
          condicion: Database["public"]["Enums"]["condicion_item_recepcion"]
          created_at: string
          id: string
          lote: string
          recepcion_id: string
          sku_id: string | null
        }
        Insert: {
          cantidad_esperada?: number
          cantidad_recibida?: number
          condicion?: Database["public"]["Enums"]["condicion_item_recepcion"]
          created_at?: string
          id?: string
          lote?: string
          recepcion_id: string
          sku_id?: string | null
        }
        Update: {
          cantidad_esperada?: number
          cantidad_recibida?: number
          condicion?: Database["public"]["Enums"]["condicion_item_recepcion"]
          created_at?: string
          id?: string
          lote?: string
          recepcion_id?: string
          sku_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_recepcion_recepcion_id_fkey"
            columns: ["recepcion_id"]
            isOneToOne: false
            referencedRelation: "recepciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_recepcion_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_config: {
        Row: {
          created_at: string
          id: string
          metric: string
          profile_type: string
          scope: string
          scope_id: string | null
          slot: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          profile_type: string
          scope?: string
          scope_id?: string | null
          slot: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          profile_type?: string
          scope?: string
          scope_id?: string | null
          slot?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          analyzed_at: string | null
          created_at: string
          evidence_id: string | null
          folio: string
          id: string
          lab_origin: string
          laboratory_name: string
          notes: string | null
          organization_id: string
          received_at: string | null
          reported_at: string | null
          sampled_at: string
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string
          evidence_id?: string | null
          folio: string
          id?: string
          lab_origin?: string
          laboratory_name: string
          notes?: string | null
          organization_id: string
          received_at?: string | null
          reported_at?: string | null
          sampled_at: string
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string
          evidence_id?: string | null
          folio?: string
          id?: string
          lab_origin?: string
          laboratory_name?: string
          notes?: string | null
          organization_id?: string
          received_at?: string | null
          reported_at?: string | null
          sampled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string
          id: string
          lab_sample_id: string
          method: string | null
          parameter: string
          unit: string
          value_numeric: number | null
          value_qualifier: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lab_sample_id: string
          method?: string | null
          parameter: string
          unit: string
          value_numeric?: number | null
          value_qualifier?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lab_sample_id?: string
          method?: string | null
          parameter?: string
          unit?: string
          value_numeric?: number | null
          value_qualifier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_lab_sample_id_fkey"
            columns: ["lab_sample_id"]
            isOneToOne: false
            referencedRelation: "lab_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_samples: {
        Row: {
          created_at: string
          id: string
          lab_report_id: string
          lot_id: string | null
          production_stage: string | null
          sample_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          lab_report_id: string
          lot_id?: string | null
          production_stage?: string | null
          sample_code: string
        }
        Update: {
          created_at?: string
          id?: string
          lab_report_id?: string
          lot_id?: string | null
          production_stage?: string | null
          sample_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_samples_lab_report_id_fkey"
            columns: ["lab_report_id"]
            isOneToOne: false
            referencedRelation: "lab_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      label_cases: {
        Row: {
          bottled_at: string | null
          bottles_per_case: number
          case_count: number | null
          created_at: string
          id: string
          label_id: string
          notes: string | null
          organization_id: string
          total_bottles: number | null
        }
        Insert: {
          bottled_at?: string | null
          bottles_per_case?: number
          case_count?: number | null
          created_at?: string
          id?: string
          label_id: string
          notes?: string | null
          organization_id: string
          total_bottles?: number | null
        }
        Update: {
          bottled_at?: string | null
          bottles_per_case?: number
          case_count?: number | null
          created_at?: string
          id?: string
          label_id?: string
          notes?: string | null
          organization_id?: string
          total_bottles?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "label_cases_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          bottle_volume_ml: number
          created_at: string
          id: string
          lot_id: string | null
          name: string
          notes: string | null
          organization_id: string
          vintage_year: number | null
        }
        Insert: {
          bottle_volume_ml?: number
          created_at?: string
          id?: string
          lot_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          vintage_year?: number | null
        }
        Update: {
          bottle_volume_ml?: number
          created_at?: string
          id?: string
          lot_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          vintage_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_grape_inputs: {
        Row: {
          created_at: string
          harvest_cut_id: string | null
          id: string
          intended_style: string | null
          lot_id: string
          notes: string | null
          organization_id: string
          received_at: string
          varietal_id: string | null
          vineyard_id: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string
          harvest_cut_id?: string | null
          id?: string
          intended_style?: string | null
          lot_id: string
          notes?: string | null
          organization_id: string
          received_at: string
          varietal_id?: string | null
          vineyard_id?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string
          harvest_cut_id?: string | null
          id?: string
          intended_style?: string | null
          lot_id?: string
          notes?: string | null
          organization_id?: string
          received_at?: string
          varietal_id?: string | null
          vineyard_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "lot_grape_inputs_harvest_cut_id_fkey"
            columns: ["harvest_cut_id"]
            isOneToOne: false
            referencedRelation: "harvest_cuts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_grape_inputs_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_grape_inputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_grape_inputs_varietal_id_fkey"
            columns: ["varietal_id"]
            isOneToOne: false
            referencedRelation: "varietals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_grape_inputs_vineyard_id_fkey"
            columns: ["vineyard_id"]
            isOneToOne: false
            referencedRelation: "vineyards"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_relationships: {
        Row: {
          child_lot_id: string
          created_at: string
          id: string
          notes: string | null
          occurred_at: string
          organization_id: string
          parent_lot_id: string
          relationship_type: string
          volume_liters_contributed: number | null
        }
        Insert: {
          child_lot_id: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at: string
          organization_id: string
          parent_lot_id: string
          relationship_type: string
          volume_liters_contributed?: number | null
        }
        Update: {
          child_lot_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          parent_lot_id?: string
          relationship_type?: string
          volume_liters_contributed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_relationships_child_lot_id_fkey"
            columns: ["child_lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_relationships_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          abv: number | null
          bodega_id: string
          clerk_id: string
          comunidad: string
          created_at: string
          estado: Database["public"]["Enums"]["dest_lote_estado"]
          fecha_embotellado_programada: string | null
          fecha_recepcion: string
          id: string
          litros_disponibles_granel: number
          litros_recibidos: number
          maestro: string
          nota: string | null
          numero_lote: string
          precio_venta: number | null
          producto_viaje_id: string
          tipo_agave: string
          updated_at: string
          viaje_id: string
        }
        Insert: {
          abv?: number | null
          bodega_id: string
          clerk_id: string
          comunidad?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_lote_estado"]
          fecha_embotellado_programada?: string | null
          fecha_recepcion?: string
          id?: string
          litros_disponibles_granel: number
          litros_recibidos: number
          maestro?: string
          nota?: string | null
          numero_lote: string
          precio_venta?: number | null
          producto_viaje_id: string
          tipo_agave: string
          updated_at?: string
          viaje_id: string
        }
        Update: {
          abv?: number | null
          bodega_id?: string
          clerk_id?: string
          comunidad?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_lote_estado"]
          fecha_embotellado_programada?: string | null
          fecha_recepcion?: string
          id?: string
          litros_disponibles_granel?: number
          litros_recibidos?: number
          maestro?: string
          nota?: string | null
          numero_lote?: string
          precio_venta?: number | null
          producto_viaje_id?: string
          tipo_agave?: string
          updated_at?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_producto_viaje_id_fkey"
            columns: ["producto_viaje_id"]
            isOneToOne: false
            referencedRelation: "productos_viaje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          code: string
          created_at: string
          current_stage: string | null
          etapa: Database["public"]["Enums"]["lot_etapa"]
          id: string
          notes: string | null
          organization_id: string
          product_type: string
          status: string
          vintage_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_stage?: string | null
          etapa?: Database["public"]["Enums"]["lot_etapa"]
          id?: string
          notes?: string | null
          organization_id: string
          product_type?: string
          status?: string
          vintage_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_stage?: string | null
          etapa?: Database["public"]["Enums"]["lot_etapa"]
          id?: string
          notes?: string | null
          organization_id?: string
          product_type?: string
          status?: string
          vintage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tool_calls: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          organization_id: string | null
          profile_type: string
          status: string
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          organization_id?: string | null
          profile_type: string
          status: string
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          organization_id?: string | null
          profile_type?: string
          status?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tool_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          bodega_destino_id: string | null
          bodega_origen_id: string | null
          botella_id: string | null
          caja_id: string | null
          clerk_id: string
          created_at: string
          id: string
          metodo: Database["public"]["Enums"]["dest_movimiento_metodo"]
          notas: string | null
          pedido_id: string | null
          tiene_pedido: boolean
          timestamp: string
          tipo: Database["public"]["Enums"]["dest_movimiento_tipo"]
        }
        Insert: {
          bodega_destino_id?: string | null
          bodega_origen_id?: string | null
          botella_id?: string | null
          caja_id?: string | null
          clerk_id: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["dest_movimiento_metodo"]
          notas?: string | null
          pedido_id?: string | null
          tiene_pedido?: boolean
          timestamp?: string
          tipo: Database["public"]["Enums"]["dest_movimiento_tipo"]
        }
        Update: {
          bodega_destino_id?: string | null
          bodega_origen_id?: string | null
          botella_id?: string | null
          caja_id?: string | null
          clerk_id?: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["dest_movimiento_metodo"]
          notas?: string | null
          pedido_id?: string | null
          tiene_pedido?: boolean
          timestamp?: string
          tipo?: Database["public"]["Enums"]["dest_movimiento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_botella_id_fkey"
            columns: ["botella_id"]
            isOneToOne: false
            referencedRelation: "botellas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_pedido_dest_fk"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_destilador"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_sku: {
        Row: {
          cantidad: number
          clerk_id: string
          client_id: string | null
          created_at: string
          event: string | null
          fecha: string
          id: string
          moneda: string | null
          notas: string | null
          precio_unitario: number | null
          profile_type_v2: string
          reason: string | null
          recipient: string | null
          sku_id: string
          tipo: string
          total: number | null
          user_id: string | null
        }
        Insert: {
          cantidad: number
          clerk_id: string
          client_id?: string | null
          created_at?: string
          event?: string | null
          fecha?: string
          id?: string
          moneda?: string | null
          notas?: string | null
          precio_unitario?: number | null
          profile_type_v2?: string
          reason?: string | null
          recipient?: string | null
          sku_id: string
          tipo: string
          total?: number | null
          user_id?: string | null
        }
        Update: {
          cantidad?: number
          clerk_id?: string
          client_id?: string | null
          created_at?: string
          event?: string | null
          fecha?: string
          id?: string
          moneda?: string | null
          notas?: string | null
          precio_unitario?: number | null
          profile_type_v2?: string
          reason?: string | null
          recipient?: string | null
          sku_id?: string
          tipo?: string
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_sku_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_sku_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          id: string
          oc_id: string | null
          pedido_id: string | null
          profile_type_v2: string
          sku_id: string
          timestamp: string
          tipo: string
          trabajador_id: string | null
          user_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          oc_id?: string | null
          pedido_id?: string | null
          profile_type_v2?: string
          sku_id: string
          timestamp?: string
          tipo: string
          trabajador_id?: string | null
          user_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          oc_id?: string | null
          pedido_id?: string | null
          profile_type_v2?: string
          sku_id?: string
          timestamp?: string
          tipo?: string
          trabajador_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_distribuidor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_orden_compra"]
          fecha_esperada: string | null
          id: string
          notas: string | null
          productor_id: string
          profile_type_v2: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_orden_compra"]
          fecha_esperada?: string | null
          id?: string
          notas?: string | null
          productor_id?: string
          profile_type_v2?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_orden_compra"]
          fecha_esperada?: string | null
          id?: string
          notas?: string | null
          productor_id?: string
          profile_type_v2?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ordenes_compra_distribuidor: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_orden_compra_distribuidor"]
          fecha_estimada: string | null
          fecha_recepcion: string | null
          id: string
          numero_orden: string
          profile_type_v2: string
          proveedor_nombre: string
          total_acordado: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_orden_compra_distribuidor"]
          fecha_estimada?: string | null
          fecha_recepcion?: string | null
          id?: string
          numero_orden: string
          profile_type_v2?: string
          proveedor_nombre?: string
          total_acordado?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_orden_compra_distribuidor"]
          fecha_estimada?: string | null
          fecha_recepcion?: string | null
          id?: string
          numero_orden?: string
          profile_type_v2?: string
          proveedor_nombre?: string
          total_acordado?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          clerk_id: string
          client_contact: string | null
          client_name: string
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          products: Json | null
          status: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          clerk_id: string
          client_contact?: string | null
          client_name: string
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          products?: Json | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          clerk_id?: string
          client_contact?: string | null
          client_name?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          products?: Json | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_cycle: string | null
          billing_email: string | null
          created_at: string
          features: Json
          founding_member_at: string | null
          id: string
          name: string
          org_type: string
          plan: string
          plan_status: string
          primer_registro_at: string | null
          renewal_anchor: string | null
          settings: Json
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          billing_email?: string | null
          created_at?: string
          features?: Json
          founding_member_at?: string | null
          id?: string
          name: string
          org_type: string
          plan?: string
          plan_status?: string
          primer_registro_at?: string | null
          renewal_anchor?: string | null
          settings?: Json
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          billing_email?: string | null
          created_at?: string
          features?: Json
          founding_member_at?: string | null
          id?: string
          name?: string
          org_type?: string
          plan?: string
          plan_status?: string
          primer_registro_at?: string | null
          renewal_anchor?: string | null
          settings?: Json
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      organizations_legacy: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          banco_destino: string | null
          banco_origen: string | null
          cliente_id: string
          created_at: string
          estado: string
          fecha_pago: string
          fecha_vencimiento: string | null
          id: string
          imagen_comprobante_url: string | null
          monto: number
          profile_type_v2: string
          referencia: string | null
          user_id: string
        }
        Insert: {
          banco_destino?: string | null
          banco_origen?: string | null
          cliente_id: string
          created_at?: string
          estado: string
          fecha_pago: string
          fecha_vencimiento?: string | null
          id?: string
          imagen_comprobante_url?: string | null
          monto: number
          profile_type_v2?: string
          referencia?: string | null
          user_id: string
        }
        Update: {
          banco_destino?: string | null
          banco_origen?: string | null
          cliente_id?: string
          created_at?: string
          estado?: string
          fecha_pago?: string
          fecha_vencimiento?: string | null
          id?: string
          imagen_comprobante_url?: string | null
          monto?: number
          profile_type_v2?: string
          referencia?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_cliente: {
        Row: {
          created_at: string
          cuenta_por_cobrar_id: string
          fecha_pago: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago_cliente"]
          monto: number
          nota: string | null
          profile_type_v2: string
          referencia: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cuenta_por_cobrar_id: string
          fecha_pago?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago_cliente"]
          monto: number
          nota?: string | null
          profile_type_v2?: string
          referencia?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cuenta_por_cobrar_id?: string
          fecha_pago?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago_cliente"]
          monto?: number
          nota?: string | null
          profile_type_v2?: string
          referencia?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_cuenta_por_cobrar_id_fkey"
            columns: ["cuenta_por_cobrar_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_cobrar"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_pedidos: {
        Row: {
          id: string
          monto_aplicado: number
          pago_id: string
          pedido_id: string
        }
        Insert: {
          id?: string
          monto_aplicado: number
          pago_id: string
          pedido_id: string
        }
        Update: {
          id?: string
          monto_aplicado?: number
          pago_id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_pedidos_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_proveedor: {
        Row: {
          created_at: string
          cuenta_por_pagar_id: string
          fecha_pago: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago_proveedor"]
          monto: number
          nota: string | null
          profile_type_v2: string
          referencia: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cuenta_por_pagar_id: string
          fecha_pago?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago_proveedor"]
          monto: number
          nota?: string | null
          profile_type_v2?: string
          referencia?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cuenta_por_pagar_id?: string
          fecha_pago?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago_proveedor"]
          monto?: number
          nota?: string | null
          profile_type_v2?: string
          referencia?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_proveedor_cuenta_por_pagar_id_fkey"
            columns: ["cuenta_por_pagar_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      pallets: {
        Row: {
          cases: number
          created_at: string
          finished_goods_id: string
          id: string
          location_id: string | null
          metadata: Json
          pallet_code: string
          status: Database["public"]["Enums"]["PalletStatus"]
        }
        Insert: {
          cases: number
          created_at?: string
          finished_goods_id: string
          id: string
          location_id?: string | null
          metadata?: Json
          pallet_code: string
          status?: Database["public"]["Enums"]["PalletStatus"]
        }
        Update: {
          cases?: number
          created_at?: string
          finished_goods_id?: string
          id?: string
          location_id?: string | null
          metadata?: Json
          pallet_code?: string
          status?: Database["public"]["Enums"]["PalletStatus"]
        }
        Relationships: [
          {
            foreignKeyName: "pallets_finished_goods_id_fkey"
            columns: ["finished_goods_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          anticipo: boolean
          cliente_id: string | null
          clients_id: string
          condicion_pago: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id: string | null
          etiqueta_nombre: string | null
          fecha_creacion: string
          fecha_entrega: string
          id: string
          imagen_origen_url: string | null
          nota: string | null
          notas: string | null
          numero: string
          profile_type_v2: string
          ticket_exportado: boolean
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          anticipo?: boolean
          cliente_id?: string | null
          clients_id: string
          condicion_pago?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id?: string | null
          etiqueta_nombre?: string | null
          fecha_creacion?: string
          fecha_entrega: string
          id?: string
          imagen_origen_url?: string | null
          nota?: string | null
          notas?: string | null
          numero: string
          profile_type_v2?: string
          ticket_exportado?: boolean
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          anticipo?: boolean
          cliente_id?: string | null
          clients_id?: string
          condicion_pago?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id?: string | null
          etiqueta_nombre?: string | null
          fecha_creacion?: string
          fecha_entrega?: string
          id?: string
          imagen_origen_url?: string | null
          nota?: string | null
          notas?: string | null
          numero?: string
          profile_type_v2?: string
          ticket_exportado?: boolean
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_clients_id_fkey"
            columns: ["clients_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "client_etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_destilador: {
        Row: {
          anticipo: number
          clerk_id: string
          cliente_nombre: string
          cliente_tipo: Database["public"]["Enums"]["dest_cliente_tipo"]
          condicion_pago: Database["public"]["Enums"]["dest_condicion_pago"]
          created_at: string
          estado: Database["public"]["Enums"]["dest_pedido_estado"]
          fecha_entrega: string | null
          fecha_pedido: string
          fecha_vencimiento: string | null
          id: string
          numero_pedido: string
          saldo_pendiente: number | null
          total_acordado: number
          updated_at: string
        }
        Insert: {
          anticipo?: number
          clerk_id: string
          cliente_nombre: string
          cliente_tipo?: Database["public"]["Enums"]["dest_cliente_tipo"]
          condicion_pago?: Database["public"]["Enums"]["dest_condicion_pago"]
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_pedido_estado"]
          fecha_entrega?: string | null
          fecha_pedido?: string
          fecha_vencimiento?: string | null
          id?: string
          numero_pedido: string
          saldo_pendiente?: number | null
          total_acordado?: number
          updated_at?: string
        }
        Update: {
          anticipo?: number
          clerk_id?: string
          cliente_nombre?: string
          cliente_tipo?: Database["public"]["Enums"]["dest_cliente_tipo"]
          condicion_pago?: Database["public"]["Enums"]["dest_condicion_pago"]
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_pedido_estado"]
          fecha_entrega?: string | null
          fecha_pedido?: string
          fecha_vencimiento?: string | null
          id?: string
          numero_pedido?: string
          saldo_pendiente?: number | null
          total_acordado?: number
          updated_at?: string
        }
        Relationships: []
      }
      plan_limites: {
        Row: {
          etiquetas: number | null
          features: Json
          lotes_activos: number | null
          max_usuarios: number | null
          memoria_meses: number | null
          plan: string
        }
        Insert: {
          etiquetas?: number | null
          features?: Json
          lotes_activos?: number | null
          max_usuarios?: number | null
          memoria_meses?: number | null
          plan: string
        }
        Update: {
          etiquetas?: number | null
          features?: Json
          lotes_activos?: number | null
          max_usuarios?: number | null
          memoria_meses?: number | null
          plan?: string
        }
        Relationships: []
      }
      production_costs: {
        Row: {
          amount: number
          batch_id: string | null
          category: string
          clerk_id: string
          created_at: string | null
          currency: string | null
          date: string | null
          description: string
          id: string
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          category: string
          clerk_id: string
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description: string
          id?: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          category?: string
          clerk_id?: string
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_costs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_viaje: {
        Row: {
          anticipo_pagado: number
          clerk_id: string
          created_at: string
          flete_proporcional: number | null
          id: string
          litros_acordados: number
          litros_recibidos: number | null
          litros_salida: number | null
          merma_litros: number | null
          precio_por_litro: number
          saldo_pendiente: number | null
          tipo_agave: string
          total_acordado: number | null
          updated_at: string
          viaje_id: string
        }
        Insert: {
          anticipo_pagado?: number
          clerk_id: string
          created_at?: string
          flete_proporcional?: number | null
          id?: string
          litros_acordados: number
          litros_recibidos?: number | null
          litros_salida?: number | null
          merma_litros?: number | null
          precio_por_litro: number
          saldo_pendiente?: number | null
          tipo_agave: string
          total_acordado?: number | null
          updated_at?: string
          viaje_id: string
        }
        Update: {
          anticipo_pagado?: number
          clerk_id?: string
          created_at?: string
          flete_proporcional?: number | null
          id?: string
          litros_acordados?: number
          litros_recibidos?: number | null
          litros_salida?: number | null
          merma_litros?: number | null
          precio_por_litro?: number
          saldo_pendiente?: number | null
          tipo_agave?: string
          total_acordado?: number | null
          updated_at?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_viaje_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      proof_profiles: {
        Row: {
          agent_name: string | null
          banco_deposito: string | null
          business_name: string | null
          categories: string[] | null
          clerk_id: string
          constancia_fiscal_path: string | null
          created_at: string | null
          cuenta_deposito: string | null
          destilador_membresia:
            | Database["public"]["Enums"]["dest_membresia"]
            | null
          email: string | null
          extra_profiles: string[] | null
          id: string
          is_super_user: boolean | null
          onboarding_complete: boolean | null
          producer_type: string | null
          profile_type: string | null
          profile_type_v2: string | null
          titular_cuenta: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          agent_name?: string | null
          banco_deposito?: string | null
          business_name?: string | null
          categories?: string[] | null
          clerk_id: string
          constancia_fiscal_path?: string | null
          created_at?: string | null
          cuenta_deposito?: string | null
          destilador_membresia?:
            | Database["public"]["Enums"]["dest_membresia"]
            | null
          email?: string | null
          extra_profiles?: string[] | null
          id?: string
          is_super_user?: boolean | null
          onboarding_complete?: boolean | null
          producer_type?: string | null
          profile_type?: string | null
          profile_type_v2?: string | null
          titular_cuenta?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          agent_name?: string | null
          banco_deposito?: string | null
          business_name?: string | null
          categories?: string[] | null
          clerk_id?: string
          constancia_fiscal_path?: string | null
          created_at?: string | null
          cuenta_deposito?: string | null
          destilador_membresia?:
            | Database["public"]["Enums"]["dest_membresia"]
            | null
          email?: string | null
          extra_profiles?: string[] | null
          id?: string
          is_super_user?: boolean | null
          onboarding_complete?: boolean | null
          producer_type?: string | null
          profile_type?: string | null
          profile_type_v2?: string | null
          titular_cuenta?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      proof_sequences: {
        Row: {
          oc_seq: number
          pedido_seq: number
          profile_type_v2: string
          recepcion_seq: number
          rem_seq: number
          sku_seq: number
          user_id: string
        }
        Insert: {
          oc_seq?: number
          pedido_seq?: number
          profile_type_v2?: string
          recepcion_seq?: number
          rem_seq?: number
          sku_seq?: number
          user_id: string
        }
        Update: {
          oc_seq?: number
          pedido_seq?: number
          profile_type_v2?: string
          recepcion_seq?: number
          rem_seq?: number
          sku_seq?: number
          user_id?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          category: string
          cost_per_unit: number | null
          expires_at: string | null
          id: string
          lot_number: string | null
          metadata: Json
          name: string
          organization_id: string
          quantity: number
          received_at: string
          supplier_id: string | null
          unit: string
        }
        Insert: {
          category: string
          cost_per_unit?: number | null
          expires_at?: string | null
          id: string
          lot_number?: string | null
          metadata?: Json
          name: string
          organization_id: string
          quantity: number
          received_at?: string
          supplier_id?: string | null
          unit: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          expires_at?: string | null
          id?: string
          lot_number?: string | null
          metadata?: Json
          name?: string
          organization_id?: string
          quantity?: number
          received_at?: string
          supplier_id?: string | null
          unit?: string
        }
        Relationships: []
      }
      recepciones: {
        Row: {
          bodega_destino: string
          codigo: string
          costo_total: number
          created_at: string
          deuda_registrada: number
          estado: Database["public"]["Enums"]["estado_recepcion"]
          fecha_recepcion: string
          foto_urls: string[]
          id: string
          orden_compra_distribuidor_id: string | null
          orden_compra_id: string | null
          productor: string
          profile_type_v2: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bodega_destino?: string
          codigo: string
          costo_total?: number
          created_at?: string
          deuda_registrada?: number
          estado?: Database["public"]["Enums"]["estado_recepcion"]
          fecha_recepcion?: string
          foto_urls?: string[]
          id?: string
          orden_compra_distribuidor_id?: string | null
          orden_compra_id?: string | null
          productor: string
          profile_type_v2?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bodega_destino?: string
          codigo?: string
          costo_total?: number
          created_at?: string
          deuda_registrada?: number
          estado?: Database["public"]["Enums"]["estado_recepcion"]
          fecha_recepcion?: string
          foto_urls?: string[]
          id?: string
          orden_compra_distribuidor_id?: string | null
          orden_compra_id?: string | null
          productor?: string
          profile_type_v2?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepciones_orden_compra_distribuidor_id_fkey"
            columns: ["orden_compra_distribuidor_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra_distribuidor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepciones_orden_compra_id_fkey"
            columns: ["orden_compra_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          organization_id: string
          product_type: string
          steps: Json
          target_alcohol: number | null
          target_liters: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          metadata?: Json
          name: string
          organization_id: string
          product_type: string
          steps?: Json
          target_alcohol?: number | null
          target_liters: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          product_type?: string
          steps?: Json
          target_alcohol?: number | null
          target_liters?: number
        }
        Relationships: []
      }
      remisiones_distribuidor: {
        Row: {
          created_at: string
          fecha_entrega: string
          id: string
          numero_remision: string
          pdf_url: string | null
          pedido_id: string
          profile_type_v2: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fecha_entrega: string
          id?: string
          numero_remision: string
          pdf_url?: string | null
          pedido_id: string
          profile_type_v2?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fecha_entrega?: string
          id?: string
          numero_remision?: string
          pdf_url?: string | null
          pedido_id?: string
          profile_type_v2?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remisiones_distribuidor_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      samples: {
        Row: {
          analysis: string | null
          batch_id: string | null
          created_at: string | null
          density: number | null
          id: string
          img_url: string | null
          notes: string | null
          ph: number | null
          type: string | null
        }
        Insert: {
          analysis?: string | null
          batch_id?: string | null
          created_at?: string | null
          density?: number | null
          id?: string
          img_url?: string | null
          notes?: string | null
          ph?: number | null
          type?: string | null
        }
        Update: {
          analysis?: string | null
          batch_id?: string | null
          created_at?: string | null
          density?: number | null
          id?: string
          img_url?: string | null
          notes?: string | null
          ph?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "samples_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      skus: {
        Row: {
          bodega: string
          botellas_por_caja: number
          categoria: Database["public"]["Enums"]["categoria_sku"]
          categoria_liquido: string
          cliente_id: string | null
          codigo: string
          costo_unitario: number
          created_at: string
          deuda_asociada: number
          dias_sin_movimiento: number
          en_consignacion: boolean
          en_transito: boolean
          estado: Database["public"]["Enums"]["estado_sku"]
          etiqueta_id: string | null
          id: string
          imagen_url: string | null
          lote: string
          margen_porcentaje: number | null
          moneda: string
          nombre: string
          notas: string | null
          origen: string
          precio_especial: number
          precio_mayoreo: number
          precio_venta: number
          productor: string
          profile_type_v2: string
          rotacion_30d: Database["public"]["Enums"]["rotacion_30d"]
          stock_disponible: number | null
          stock_minimo: number
          stock_reservado: number
          stock_total: number
          tipo_unidad: string
          ultimo_movimiento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bodega?: string
          botellas_por_caja?: number
          categoria?: Database["public"]["Enums"]["categoria_sku"]
          categoria_liquido?: string
          cliente_id?: string | null
          codigo: string
          costo_unitario?: number
          created_at?: string
          deuda_asociada?: number
          dias_sin_movimiento?: number
          en_consignacion?: boolean
          en_transito?: boolean
          estado?: Database["public"]["Enums"]["estado_sku"]
          etiqueta_id?: string | null
          id?: string
          imagen_url?: string | null
          lote?: string
          margen_porcentaje?: number | null
          moneda?: string
          nombre: string
          notas?: string | null
          origen?: string
          precio_especial?: number
          precio_mayoreo?: number
          precio_venta?: number
          productor?: string
          profile_type_v2?: string
          rotacion_30d?: Database["public"]["Enums"]["rotacion_30d"]
          stock_disponible?: number | null
          stock_minimo?: number
          stock_reservado?: number
          stock_total?: number
          tipo_unidad?: string
          ultimo_movimiento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bodega?: string
          botellas_por_caja?: number
          categoria?: Database["public"]["Enums"]["categoria_sku"]
          categoria_liquido?: string
          cliente_id?: string | null
          codigo?: string
          costo_unitario?: number
          created_at?: string
          deuda_asociada?: number
          dias_sin_movimiento?: number
          en_consignacion?: boolean
          en_transito?: boolean
          estado?: Database["public"]["Enums"]["estado_sku"]
          etiqueta_id?: string | null
          id?: string
          imagen_url?: string | null
          lote?: string
          margen_porcentaje?: number | null
          moneda?: string
          nombre?: string
          notas?: string | null
          origen?: string
          precio_especial?: number
          precio_mayoreo?: number
          precio_venta?: number
          productor?: string
          profile_type_v2?: string
          rotacion_30d?: Database["public"]["Enums"]["rotacion_30d"]
          stock_disponible?: number | null
          stock_minimo?: number
          stock_reservado?: number
          stock_total?: number
          tipo_unidad?: string
          ultimo_movimiento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skus_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skus_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "client_etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      skus_legacy_prisma: {
        Row: {
          case_pack: number
          code: string
          id: string
          metadata: Json
          name: string
          organization_id: string
          packaging_type: string
          volume_ml: number
        }
        Insert: {
          case_pack?: number
          code: string
          id: string
          metadata?: Json
          name: string
          organization_id: string
          packaging_type: string
          volume_ml: number
        }
        Update: {
          case_pack?: number
          code?: string
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          packaging_type?: string
          volume_ml?: number
        }
        Relationships: []
      }
      stock_botellas_vacias: {
        Row: {
          bodega_id: string
          cantidad_disponible: number
          clerk_id: string
          costo_unitario: number
          created_at: string
          formato: Database["public"]["Enums"]["dest_formato_botella"]
          id: string
          updated_at: string
        }
        Insert: {
          bodega_id: string
          cantidad_disponible?: number
          clerk_id: string
          costo_unitario?: number
          created_at?: string
          formato: Database["public"]["Enums"]["dest_formato_botella"]
          id?: string
          updated_at?: string
        }
        Update: {
          bodega_id?: string
          cantidad_disponible?: number
          clerk_id?: string
          costo_unitario?: number
          created_at?: string
          formato?: Database["public"]["Enums"]["dest_formato_botella"]
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_botellas_vacias_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_etiquetas: {
        Row: {
          bodega_id: string
          cantidad_disponible: number
          clerk_id: string
          costo_unitario: number
          created_at: string
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["dest_etiqueta_tipo"]
          updated_at: string
        }
        Insert: {
          bodega_id: string
          cantidad_disponible?: number
          clerk_id: string
          costo_unitario?: number
          created_at?: string
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["dest_etiqueta_tipo"]
          updated_at?: string
        }
        Update: {
          bodega_id?: string
          cantidad_disponible?: number
          clerk_id?: string
          costo_unitario?: number
          created_at?: string
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["dest_etiqueta_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_etiquetas_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          organization_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          organization_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajadores: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          patron_user_id: string
          profile_type_v2: string
          rol: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          patron_user_id: string
          profile_type_v2?: string
          rol: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          patron_user_id?: string
          profile_type_v2?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajadores_patron_user_id_fkey"
            columns: ["patron_user_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string
          role: Database["public"]["Enums"]["UserRole"]
        }
        Insert: {
          clerk_id: string
          created_at?: string
          email: string
          id: string
          name: string
          organization_id: string
          role?: Database["public"]["Enums"]["UserRole"]
        }
        Update: {
          clerk_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["UserRole"]
        }
        Relationships: []
      }
      varietals: {
        Row: {
          category: string
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "varietals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vessels: {
        Row: {
          capacity_liters: number | null
          created_at: string
          id: string
          is_active: boolean
          material: string | null
          name: string
          notes: string | null
          organization_id: string
          vessel_type: string
        }
        Insert: {
          capacity_liters?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          material?: string | null
          name: string
          notes?: string | null
          organization_id: string
          vessel_type: string
        }
        Update: {
          capacity_liters?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          material?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          vessel_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes: {
        Row: {
          clerk_id: string
          comunidad: string
          costo_flete: number
          created_at: string
          estado: Database["public"]["Enums"]["dest_viaje_estado"]
          fecha: string
          id: string
          palenquero_contacto: string
          palenquero_nombre: string
          region: string
          updated_at: string
        }
        Insert: {
          clerk_id: string
          comunidad?: string
          costo_flete?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_viaje_estado"]
          fecha?: string
          id?: string
          palenquero_contacto?: string
          palenquero_nombre?: string
          region?: string
          updated_at?: string
        }
        Update: {
          clerk_id?: string
          comunidad?: string
          costo_flete?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["dest_viaje_estado"]
          fecha?: string
          id?: string
          palenquero_contacto?: string
          palenquero_nombre?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      vineyards: {
        Row: {
          area_ha: number | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          organization_id: string
          ownership_type: string
        }
        Insert: {
          area_ha?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          organization_id: string
          ownership_type?: string
        }
        Update: {
          area_ha?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          ownership_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vineyards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vintages: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          status: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vintages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_exits: {
        Row: {
          batch_id: string | null
          clerk_id: string
          created_at: string | null
          currency: string | null
          exit_date: string | null
          id: string
          notes: string | null
          price_per_unit: number | null
          product_name: string
          total: number | null
          units: number
        }
        Insert: {
          batch_id?: string | null
          clerk_id: string
          created_at?: string | null
          currency?: string | null
          exit_date?: string | null
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          product_name: string
          total?: number | null
          units?: number
        }
        Update: {
          batch_id?: string | null
          clerk_id?: string
          created_at?: string | null
          currency?: string | null
          exit_date?: string | null
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          product_name?: string
          total?: number | null
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_exits_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          aisle: string
          bay: number
          id: string
          level: number
          metadata: Json
          occupied: boolean
          zone_id: string
        }
        Insert: {
          aisle: string
          bay: number
          id: string
          level: number
          metadata?: Json
          occupied?: boolean
          zone_id: string
        }
        Update: {
          aisle?: string
          bay?: number
          id?: string
          level?: number
          metadata?: Json
          occupied?: boolean
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_zones: {
        Row: {
          code: string
          id: string
          metadata: Json
          name: string
          temp_max: number | null
          temp_min: number | null
          total_bays: number
          warehouse_id: string
        }
        Insert: {
          code: string
          id: string
          metadata?: Json
          name: string
          temp_max?: number | null
          temp_min?: number | null
          total_bays?: number
          warehouse_id: string
        }
        Update: {
          code?: string
          id?: string
          metadata?: Json
          name?: string
          temp_max?: number | null
          temp_min?: number | null
          total_bays?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_zones_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          id: string
          metadata: Json
          name: string
          organization_id: string
        }
        Insert: {
          address?: string | null
          id: string
          metadata?: Json
          name: string
          organization_id: string
        }
        Update: {
          address?: string | null
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      wm_document_lines: {
        Row: {
          amount: number
          created_at: string
          description: string
          discount: number
          document_id: string
          id: string
          line_index: number
          organization_id: string
          product_service_code: string
          product_service_label: string
          quantity: number | null
          supplier_id: string | null
          supply_kind: Database["public"]["Enums"]["wm_supply_kind"]
          tax_note: string
          unit: string
          unit_price: number | null
          varietal: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          discount?: number
          document_id: string
          id?: string
          line_index?: number
          organization_id: string
          product_service_code?: string
          product_service_label?: string
          quantity?: number | null
          supplier_id?: string | null
          supply_kind?: Database["public"]["Enums"]["wm_supply_kind"]
          tax_note?: string
          unit?: string
          unit_price?: number | null
          varietal?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          discount?: number
          document_id?: string
          id?: string
          line_index?: number
          organization_id?: string
          product_service_code?: string
          product_service_label?: string
          quantity?: number | null
          supplier_id?: string | null
          supply_kind?: Database["public"]["Enums"]["wm_supply_kind"]
          tax_note?: string
          unit?: string
          unit_price?: number | null
          varietal?: string
        }
        Relationships: [
          {
            foreignKeyName: "wm_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "wm_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_document_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_document_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "wm_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_documents: {
        Row: {
          concept_title: string
          created_at: string
          currency: string
          document_date: string
          document_type: Database["public"]["Enums"]["wm_document_type"]
          folio: string
          id: string
          issuer_address: string
          ocr_text: string
          organization_id: string
          original_filename: string
          parsed_json: Json
          payment_form: string
          payment_method: string
          storage_path: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_iesps: number
          tax_isr_ret: number
          tax_iva: number
          tax_iva_rate: string
          tax_iva_ret: number
          total_amount: number | null
          vendor: string
        }
        Insert: {
          concept_title?: string
          created_at?: string
          currency?: string
          document_date?: string
          document_type?: Database["public"]["Enums"]["wm_document_type"]
          folio?: string
          id?: string
          issuer_address?: string
          ocr_text?: string
          organization_id: string
          original_filename?: string
          parsed_json?: Json
          payment_form?: string
          payment_method?: string
          storage_path?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_iesps?: number
          tax_isr_ret?: number
          tax_iva?: number
          tax_iva_rate?: string
          tax_iva_ret?: number
          total_amount?: number | null
          vendor?: string
        }
        Update: {
          concept_title?: string
          created_at?: string
          currency?: string
          document_date?: string
          document_type?: Database["public"]["Enums"]["wm_document_type"]
          folio?: string
          id?: string
          issuer_address?: string
          ocr_text?: string
          organization_id?: string
          original_filename?: string
          parsed_json?: Json
          payment_form?: string
          payment_method?: string
          storage_path?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_iesps?: number
          tax_isr_ret?: number
          tax_iva?: number
          tax_iva_rate?: string
          tax_iva_ret?: number
          total_amount?: number | null
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "wm_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "wm_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_etiquetas: {
        Row: {
          created_at: string
          id: string
          nombre: string
          organization_id: string
          region: string | null
          tipo: string | null
          varietal: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          organization_id: string
          region?: string | null
          tipo?: string | null
          varietal?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          organization_id?: string
          region?: string | null
          tipo?: string | null
          varietal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wm_etiquetas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_events: {
        Row: {
          created_at: string
          document_id: string | null
          event_type: Database["public"]["Enums"]["wm_event_type"]
          id: string
          lot_id: string | null
          occurred_at: string
          organization_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          event_type: Database["public"]["Enums"]["wm_event_type"]
          id?: string
          lot_id?: string | null
          occurred_at?: string
          organization_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          document_id?: string | null
          event_type?: Database["public"]["Enums"]["wm_event_type"]
          id?: string
          lot_id?: string | null
          occurred_at?: string
          organization_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wm_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "wm_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_events_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "wm_wine_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_existencias: {
        Row: {
          anada: number
          botellas_por_caja: number
          botellas_producidas: number
          created_at: string
          etiqueta_id: string
          formato: string
          id: string
          lote_id: string
          organization_id: string
        }
        Insert: {
          anada: number
          botellas_por_caja: number
          botellas_producidas: number
          created_at?: string
          etiqueta_id: string
          formato: string
          id?: string
          lote_id: string
          organization_id: string
        }
        Update: {
          anada?: number
          botellas_por_caja?: number
          botellas_producidas?: number
          created_at?: string
          etiqueta_id?: string
          formato?: string
          id?: string
          lote_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wm_existencias_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "wm_etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_existencias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_existencias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_mensajes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          lote_id: string | null
          organization_id: string
          origen: Database["public"]["Enums"]["wm_mensaje_origen"]
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lote_id?: string | null
          organization_id: string
          origen?: Database["public"]["Enums"]["wm_mensaje_origen"]
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          lote_id?: string | null
          organization_id?: string
          origen?: Database["public"]["Enums"]["wm_mensaje_origen"]
        }
        Relationships: [
          {
            foreignKeyName: "wm_mensajes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_mensajes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_mensajes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_mensajes_lectura: {
        Row: {
          last_read_at: string
          member_id: string
          organization_id: string
        }
        Insert: {
          last_read_at?: string
          member_id: string
          organization_id: string
        }
        Update: {
          last_read_at?: string
          member_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wm_mensajes_lectura_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_mensajes_lectura_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_production_costs: {
        Row: {
          allocation_method: Database["public"]["Enums"]["wm_allocation_method"]
          amount: number
          category: Database["public"]["Enums"]["wm_cost_category"]
          cost_date: string
          created_at: string
          currency: string
          description: string
          document_id: string | null
          id: string
          lot_id: string | null
          organization_id: string
          supplier_id: string | null
          supply_kind: Database["public"]["Enums"]["wm_supply_kind"] | null
          varietal: string
        }
        Insert: {
          allocation_method?: Database["public"]["Enums"]["wm_allocation_method"]
          amount: number
          category?: Database["public"]["Enums"]["wm_cost_category"]
          cost_date?: string
          created_at?: string
          currency?: string
          description?: string
          document_id?: string | null
          id?: string
          lot_id?: string | null
          organization_id: string
          supplier_id?: string | null
          supply_kind?: Database["public"]["Enums"]["wm_supply_kind"] | null
          varietal?: string
        }
        Update: {
          allocation_method?: Database["public"]["Enums"]["wm_allocation_method"]
          amount?: number
          category?: Database["public"]["Enums"]["wm_cost_category"]
          cost_date?: string
          created_at?: string
          currency?: string
          description?: string
          document_id?: string | null
          id?: string
          lot_id?: string | null
          organization_id?: string
          supplier_id?: string | null
          supply_kind?: Database["public"]["Enums"]["wm_supply_kind"] | null
          varietal?: string
        }
        Relationships: [
          {
            foreignKeyName: "wm_production_costs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "wm_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_production_costs_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "wm_wine_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_production_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_production_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "wm_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_salidas: {
        Row: {
          botellas: number
          created_at: string
          existencia_id: string
          id: string
          organization_id: string
          origen: Database["public"]["Enums"]["wm_salida_origen"]
          rango_fin: number | null
          rango_inicio: number | null
          registrado_por: string
          tipo: Database["public"]["Enums"]["wm_salida_tipo"]
        }
        Insert: {
          botellas: number
          created_at?: string
          existencia_id: string
          id?: string
          organization_id: string
          origen?: Database["public"]["Enums"]["wm_salida_origen"]
          rango_fin?: number | null
          rango_inicio?: number | null
          registrado_por: string
          tipo: Database["public"]["Enums"]["wm_salida_tipo"]
        }
        Update: {
          botellas?: number
          created_at?: string
          existencia_id?: string
          id?: string
          organization_id?: string
          origen?: Database["public"]["Enums"]["wm_salida_origen"]
          rango_fin?: number | null
          rango_inicio?: number | null
          registrado_por?: string
          tipo?: Database["public"]["Enums"]["wm_salida_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "wm_salidas_existencia_id_fkey"
            columns: ["existencia_id"]
            isOneToOne: false
            referencedRelation: "wm_existencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_salidas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wm_salidas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_suppliers: {
        Row: {
          address: string
          contact_name: string
          created_at: string
          email: string
          id: string
          name: string
          name_normalized: string
          notes: string
          organization_id: string
          phone: string
          rfc: string
          updated_at: string
        }
        Insert: {
          address?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          name_normalized: string
          notes?: string
          organization_id: string
          phone?: string
          rfc?: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          name_normalized?: string
          notes?: string
          organization_id?: string
          phone?: string
          rfc?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wm_suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wm_wine_lots: {
        Row: {
          created_at: string
          id: string
          liters_initial: number | null
          lot_code: string
          name: string
          notes: string
          organization_id: string
          status: Database["public"]["Enums"]["wm_wine_lot_status"]
          updated_at: string
          varietal: string
          vintage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          liters_initial?: number | null
          lot_code: string
          name?: string
          notes?: string
          organization_id: string
          status?: Database["public"]["Enums"]["wm_wine_lot_status"]
          updated_at?: string
          varietal?: string
          vintage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          liters_initial?: number | null
          lot_code?: string
          name?: string
          notes?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["wm_wine_lot_status"]
          updated_at?: string
          varietal?: string
          vintage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wm_wine_lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      blend_proportions: {
        Row: {
          child_lot_id: string | null
          organization_id: string | null
          parent_lot_id: string | null
          proportion_pct: number | null
          total_volume_liters: number | null
          volume_liters_contributed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_relationships_child_lot_id_fkey"
            columns: ["child_lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_relationships_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      winemaker_notes: {
        Row: {
          actor_id: string | null
          id: string | null
          lot_id: string | null
          occurred_at: string | null
          text: string | null
          vintage_id: string | null
        }
        Insert: {
          actor_id?: string | null
          id?: string | null
          lot_id?: string | null
          occurred_at?: string | null
          text?: never
          vintage_id?: string | null
        }
        Update: {
          actor_id?: string | null
          id?: string | null
          lot_id?: string | null
          occurred_at?: string | null
          text?: never
          vintage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      actualizar_estado_pedido: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_pedido"]
          p_pedido_id: string
        }
        Returns: {
          anticipo: boolean
          cliente_id: string | null
          clients_id: string
          condicion_pago: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id: string | null
          etiqueta_nombre: string | null
          fecha_creacion: string
          fecha_entrega: string
          id: string
          imagen_origen_url: string | null
          nota: string | null
          notas: string | null
          numero: string
          profile_type_v2: string
          ticket_exportado: boolean
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_manage_org: { Args: { p_org_id: string }; Returns: boolean }
      can_write_org: { Args: { p_org_id: string }; Returns: boolean }
      cancelar_pedido: {
        Args: { p_pedido_id: string }
        Returns: {
          anticipo: boolean
          cliente_id: string | null
          clients_id: string
          condicion_pago: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id: string | null
          etiqueta_nombre: string | null
          fecha_creacion: string
          fecha_entrega: string
          id: string
          imagen_origen_url: string | null
          nota: string | null
          notas: string | null
          numero: string
          profile_type_v2: string
          ticket_exportado: boolean
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerrar_corrida_destilador: {
        Args: {
          p_botellas_defectuosas?: number
          p_botellas_producidas: number
          p_corrida_id: string
        }
        Returns: {
          cajas_generadas: number
          corrida_id: string
          costo_real_por_botella: number
          lote_id: string
          numero_lote: string
        }[]
      }
      confirmar_llegada_destilador: {
        Args: { p_lineas: Json; p_viaje_id: string }
        Returns: {
          flete_proporcional: number
          litros_recibidos: number
          lote_id: string
          merma_litros: number
          numero_lote: string
          producto_viaje_id: string
          tipo_agave: string
        }[]
      }
      confirmar_llegada_orden_compra_distribuidor: {
        Args: { p_lineas: Json; p_orden_id: string }
        Returns: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_orden_compra_distribuidor"]
          fecha_estimada: string | null
          fecha_recepcion: string | null
          id: string
          numero_orden: string
          profile_type_v2: string
          proveedor_nombre: string
          total_acordado: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ordenes_compra_distribuidor"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirmar_pedido: {
        Args: { p_pedido_id: string }
        Returns: {
          anticipo: boolean
          cliente_id: string | null
          clients_id: string
          condicion_pago: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id: string | null
          etiqueta_nombre: string | null
          fecha_creacion: string
          fecha_entrega: string
          id: string
          imagen_origen_url: string | null
          nota: string | null
          notas: string | null
          numero: string
          profile_type_v2: string
          ticket_exportado: boolean
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirmar_recepcion: {
        Args: { p_recepcion_id: string; p_registrar_deuda?: boolean }
        Returns: {
          bodega_destino: string
          codigo: string
          costo_total: number
          created_at: string
          deuda_registrada: number
          estado: Database["public"]["Enums"]["estado_recepcion"]
          fecha_recepcion: string
          foto_urls: string[]
          id: string
          orden_compra_distribuidor_id: string | null
          orden_compra_id: string | null
          productor: string
          profile_type_v2: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recepciones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_cuenta_por_cobrar_pedido: {
        Args: { p_pedido_id: string }
        Returns: {
          cliente_nombre: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta_por_cobrar"]
          fecha_vencimiento: string | null
          id: string
          monto_pagado: number
          monto_total: number
          pedido_id: string
          profile_type_v2: string
          saldo_pendiente: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cuentas_por_cobrar"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_remision_distribuidor: {
        Args: { p_pedido_id: string }
        Returns: {
          created_at: string
          fecha_entrega: string
          id: string
          numero_remision: string
          pdf_url: string | null
          pedido_id: string
          profile_type_v2: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "remisiones_distribuidor"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dest_formato_litros: {
        Args: { p_formato: Database["public"]["Enums"]["dest_formato_botella"] }
        Returns: number
      }
      entregar_pedido: {
        Args: { p_parcial?: boolean; p_pedido_id: string }
        Returns: {
          anticipo: boolean
          cliente_id: string | null
          clients_id: string
          condicion_pago: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          etiqueta_id: string | null
          etiqueta_nombre: string | null
          fecha_creacion: string
          fecha_entrega: string
          id: string
          imagen_origen_url: string | null
          nota: string | null
          notas: string | null
          numero: string
          profile_type_v2: string
          ticket_exportado: boolean
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lot_etapa_rank: {
        Args: { p_etapa: Database["public"]["Enums"]["lot_etapa"] }
        Returns: number
      }
      lot_stage_rank: { Args: { p_stage: string }; Returns: number }
      map_stage_to_etapa: {
        Args: { p_stage: string }
        Returns: Database["public"]["Enums"]["lot_etapa"]
      }
      organization_ids: { Args: never; Returns: string[] }
      organization_role: { Args: { p_org_id: string }; Returns: string }
      proof_next_codigo: {
        Args: { p_clerk_id: string; p_kind: string; p_profile_type_v2: string }
        Returns: string
      }
      registrar_movimiento_sku: {
        Args: {
          p_cantidad: number
          p_client_id?: string
          p_dist_movement_id?: string
          p_event?: string
          p_fecha?: string
          p_moneda?: string
          p_notas?: string
          p_precio_unitario?: number
          p_reason?: string
          p_recipient?: string
          p_sku_id: string
          p_tipo: string
          p_total?: number
        }
        Returns: undefined
      }
      registrar_pago_cliente: {
        Args: {
          p_cuenta_id: string
          p_metodo?: Database["public"]["Enums"]["metodo_pago_cliente"]
          p_monto: number
          p_nota?: string
          p_referencia?: string
        }
        Returns: {
          cliente_nombre: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta_por_cobrar"]
          fecha_vencimiento: string | null
          id: string
          monto_pagado: number
          monto_total: number
          pedido_id: string
          profile_type_v2: string
          saldo_pendiente: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cuentas_por_cobrar"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_pago_proveedor: {
        Args: {
          p_cuenta_id: string
          p_metodo?: Database["public"]["Enums"]["metodo_pago_proveedor"]
          p_monto: number
          p_nota?: string
          p_referencia?: string
        }
        Returns: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta_por_pagar"]
          fecha_vencimiento: string | null
          id: string
          monto_pagado: number
          monto_total: number
          orden_compra_id: string
          profile_type_v2: string
          proveedor_nombre: string
          saldo_pendiente: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cuentas_por_pagar"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      winemaker_storage_object_allowed: {
        Args: { p_name: string }
        Returns: boolean
      }
      wm_row_delete_allowed: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      wm_row_select_allowed: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      wm_row_write_allowed: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
    }
    Enums: {
      BatchState:
        | "CREATED"
        | "FERMENTING"
        | "CONDITIONING"
        | "FILTERING"
        | "BOTTLING"
        | "BOTTLED"
        | "CLOSED"
        | "DESTROYED"
      categoria_sku:
        | "tequila"
        | "vino"
        | "mezcal"
        | "cerveza"
        | "destilado"
        | "gin"
        | "otro"
      condicion_item_recepcion: "ok" | "roto" | "incompleto"
      dest_bodega_tipo: "principal" | "secundaria"
      dest_botella_estado: "en_caja" | "vendida"
      dest_caja_estado: "en_bodega" | "en_pedido" | "entregada"
      dest_cliente_tipo: "restaurante" | "tienda" | "directo" | "granel"
      dest_condicion_pago: "contado" | "30_dias" | "60_dias"
      dest_corrida_estado: "activa" | "completada"
      dest_corrida_modo: "equipo" | "manual"
      dest_etiqueta_tipo: "frontal" | "contraetiqueta" | "collarin"
      dest_formato_botella: "750ml" | "500ml" | "200ml"
      dest_item_tipo: "botella" | "granel"
      dest_lote_estado:
        | "en_bodega_crudo"
        | "en_produccion"
        | "terminado"
        | "vendido_parcial"
      dest_membresia: "basico" | "profesional" | "premium"
      dest_movimiento_metodo: "manual" | "escaneo_camara" | "pistola_bluetooth"
      dest_movimiento_tipo: "entrada" | "salida" | "traslado" | "auditoria"
      dest_pedido_estado:
        | "cotizacion"
        | "confirmado"
        | "entregado"
        | "cobrado"
        | "cancelado"
      dest_viaje_estado:
        | "en_negociacion"
        | "confirmado"
        | "en_transito"
        | "recibido"
      estado_cuenta_cliente:
        | "vigente"
        | "en_riesgo"
        | "vencido"
        | "bloqueado"
        | "incobrable"
      estado_cuenta_por_cobrar: "pendiente" | "parcial" | "pagada" | "vencida"
      estado_cuenta_por_pagar: "pendiente" | "parcial" | "pagada"
      estado_deuda_productor:
        | "al_corriente"
        | "proximo"
        | "vencido"
        | "en_negociacion"
        | "pagado"
      estado_orden_compra: "borrador" | "enviada" | "recibida" | "parcial"
      estado_orden_compra_distribuidor:
        | "pendiente"
        | "parcial"
        | "recibida"
        | "cancelada"
      estado_pedido:
        | "borrador"
        | "confirmado"
        | "preparando"
        | "en_ruta"
        | "entregado"
        | "parcial"
        | "cancelado"
      estado_recepcion:
        | "pendiente"
        | "en_revision"
        | "confirmada"
        | "con_discrepancias"
      estado_sku:
        | "sano"
        | "bajo"
        | "quiebre"
        | "muerto"
        | "en_transito"
        | "consignacion"
        | "sobrevendido"
      LossType:
        | "EVAPORATION"
        | "SAMPLING"
        | "CONTAMINATION"
        | "TRANSFER"
        | "WASTE"
        | "UNACCOUNTED"
      lot_etapa:
        | "cosecha"
        | "analisis"
        | "fermentacion"
        | "malolactica"
        | "crianza"
        | "embotellado"
      metodo_pago_cliente: "efectivo" | "transferencia" | "cheque"
      metodo_pago_proveedor: "efectivo" | "transferencia" | "cheque"
      PalletStatus: "IN_WAREHOUSE" | "STAGED" | "SHIPPED" | "DESTROYED"
      rotacion_30d: "muy_alta" | "alta" | "media" | "baja" | "ninguna"
      tipo_deuda_productor: "credito" | "consignacion" | "acuerdo_verbal"
      tipo_discrepancia:
        | "faltante"
        | "lote_diferente"
        | "roto"
        | "sku_incorrecto"
        | "excedente"
      UserRole:
        | "OWNER"
        | "ADMIN"
        | "CELLAR_MASTER"
        | "WAREHOUSE_OPS"
        | "QA"
        | "VIEWER"
        | "AUDITOR"
      wm_allocation_method: "direct" | "overhead" | "inventory_purchase"
      wm_cost_category:
        | "uva"
        | "mano_obra"
        | "energia"
        | "insumo"
        | "barrica"
        | "analisis"
        | "equipo"
        | "limpieza"
        | "flete"
        | "otro"
      wm_document_type:
        | "invoice"
        | "ticket"
        | "xml"
        | "lab_result"
        | "photo"
        | "remision"
        | "other"
      wm_event_type:
        | "harvest_received"
        | "fermentation_started"
        | "fermentation_ended"
        | "lab_sample_taken"
        | "sulfite_added"
        | "transfer"
        | "aging_started"
        | "aging_ended"
        | "blending"
        | "bottling_completed"
        | "insumo_received"
        | "insumo_consumed"
        | "cost_recorded"
        | "document_uploaded"
        | "note"
      wm_mensaje_origen: "web" | "mcp"
      wm_salida_origen: "web" | "mcp"
      wm_salida_tipo:
        | "venta"
        | "degustacion"
        | "autoconsumo"
        | "merma"
        | "ajuste"
      wm_supply_kind:
        | "uva"
        | "corcho"
        | "botella"
        | "etiqueta"
        | "caja"
        | "tapa"
        | "sulfito"
        | "levadura"
        | "clarificante"
        | "barrica"
        | "energia"
        | "mano_obra"
        | "analisis"
        | "flete"
        | "equipo"
        | "limpieza"
        | "otro"
      wm_wine_lot_status:
        | "fermentation"
        | "aging"
        | "ready"
        | "bottling"
        | "bottled"
        | "sold_out"
        | "archived"
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
  public: {
    Enums: {
      BatchState: [
        "CREATED",
        "FERMENTING",
        "CONDITIONING",
        "FILTERING",
        "BOTTLING",
        "BOTTLED",
        "CLOSED",
        "DESTROYED",
      ],
      categoria_sku: [
        "tequila",
        "vino",
        "mezcal",
        "cerveza",
        "destilado",
        "gin",
        "otro",
      ],
      condicion_item_recepcion: ["ok", "roto", "incompleto"],
      dest_bodega_tipo: ["principal", "secundaria"],
      dest_botella_estado: ["en_caja", "vendida"],
      dest_caja_estado: ["en_bodega", "en_pedido", "entregada"],
      dest_cliente_tipo: ["restaurante", "tienda", "directo", "granel"],
      dest_condicion_pago: ["contado", "30_dias", "60_dias"],
      dest_corrida_estado: ["activa", "completada"],
      dest_corrida_modo: ["equipo", "manual"],
      dest_etiqueta_tipo: ["frontal", "contraetiqueta", "collarin"],
      dest_formato_botella: ["750ml", "500ml", "200ml"],
      dest_item_tipo: ["botella", "granel"],
      dest_lote_estado: [
        "en_bodega_crudo",
        "en_produccion",
        "terminado",
        "vendido_parcial",
      ],
      dest_membresia: ["basico", "profesional", "premium"],
      dest_movimiento_metodo: ["manual", "escaneo_camara", "pistola_bluetooth"],
      dest_movimiento_tipo: ["entrada", "salida", "traslado", "auditoria"],
      dest_pedido_estado: [
        "cotizacion",
        "confirmado",
        "entregado",
        "cobrado",
        "cancelado",
      ],
      dest_viaje_estado: [
        "en_negociacion",
        "confirmado",
        "en_transito",
        "recibido",
      ],
      estado_cuenta_cliente: [
        "vigente",
        "en_riesgo",
        "vencido",
        "bloqueado",
        "incobrable",
      ],
      estado_cuenta_por_cobrar: ["pendiente", "parcial", "pagada", "vencida"],
      estado_cuenta_por_pagar: ["pendiente", "parcial", "pagada"],
      estado_deuda_productor: [
        "al_corriente",
        "proximo",
        "vencido",
        "en_negociacion",
        "pagado",
      ],
      estado_orden_compra: ["borrador", "enviada", "recibida", "parcial"],
      estado_orden_compra_distribuidor: [
        "pendiente",
        "parcial",
        "recibida",
        "cancelada",
      ],
      estado_pedido: [
        "borrador",
        "confirmado",
        "preparando",
        "en_ruta",
        "entregado",
        "parcial",
        "cancelado",
      ],
      estado_recepcion: [
        "pendiente",
        "en_revision",
        "confirmada",
        "con_discrepancias",
      ],
      estado_sku: [
        "sano",
        "bajo",
        "quiebre",
        "muerto",
        "en_transito",
        "consignacion",
        "sobrevendido",
      ],
      LossType: [
        "EVAPORATION",
        "SAMPLING",
        "CONTAMINATION",
        "TRANSFER",
        "WASTE",
        "UNACCOUNTED",
      ],
      lot_etapa: [
        "cosecha",
        "analisis",
        "fermentacion",
        "malolactica",
        "crianza",
        "embotellado",
      ],
      metodo_pago_cliente: ["efectivo", "transferencia", "cheque"],
      metodo_pago_proveedor: ["efectivo", "transferencia", "cheque"],
      PalletStatus: ["IN_WAREHOUSE", "STAGED", "SHIPPED", "DESTROYED"],
      rotacion_30d: ["muy_alta", "alta", "media", "baja", "ninguna"],
      tipo_deuda_productor: ["credito", "consignacion", "acuerdo_verbal"],
      tipo_discrepancia: [
        "faltante",
        "lote_diferente",
        "roto",
        "sku_incorrecto",
        "excedente",
      ],
      UserRole: [
        "OWNER",
        "ADMIN",
        "CELLAR_MASTER",
        "WAREHOUSE_OPS",
        "QA",
        "VIEWER",
        "AUDITOR",
      ],
      wm_allocation_method: ["direct", "overhead", "inventory_purchase"],
      wm_cost_category: [
        "uva",
        "mano_obra",
        "energia",
        "insumo",
        "barrica",
        "analisis",
        "equipo",
        "limpieza",
        "flete",
        "otro",
      ],
      wm_document_type: [
        "invoice",
        "ticket",
        "xml",
        "lab_result",
        "photo",
        "remision",
        "other",
      ],
      wm_event_type: [
        "harvest_received",
        "fermentation_started",
        "fermentation_ended",
        "lab_sample_taken",
        "sulfite_added",
        "transfer",
        "aging_started",
        "aging_ended",
        "blending",
        "bottling_completed",
        "insumo_received",
        "insumo_consumed",
        "cost_recorded",
        "document_uploaded",
        "note",
      ],
      wm_mensaje_origen: ["web", "mcp"],
      wm_salida_origen: ["web", "mcp"],
      wm_salida_tipo: [
        "venta",
        "degustacion",
        "autoconsumo",
        "merma",
        "ajuste",
      ],
      wm_supply_kind: [
        "uva",
        "corcho",
        "botella",
        "etiqueta",
        "caja",
        "tapa",
        "sulfito",
        "levadura",
        "clarificante",
        "barrica",
        "energia",
        "mano_obra",
        "analisis",
        "flete",
        "equipo",
        "limpieza",
        "otro",
      ],
      wm_wine_lot_status: [
        "fermentation",
        "aging",
        "ready",
        "bottling",
        "bottled",
        "sold_out",
        "archived",
      ],
    },
  },
} as const
