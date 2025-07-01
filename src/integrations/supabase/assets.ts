import { supabase } from "./client";
import type { Tables, TablesInsert, TablesUpdate } from "./types";

export type Asset = Tables<"assets">;
export type AssetInsert = TablesInsert<"assets">;
export type AssetUpdate = TablesUpdate<"assets">;

export const getAssets = async (projectId: string) => {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assets:", error);
    throw error;
  }

  return { data: data || [], error: null };
};

export const getAsset = async (assetId: string) => {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (error) {
    console.error("Error fetching asset:", error);
    throw error;
  }

  return { data, error: null };
};

export const createAsset = async (asset: AssetInsert) => {
  const { data, error } = await supabase
    .from("assets")
    .insert(asset)
    .select()
    .single();

  if (error) {
    console.error("Error creating asset:", error);
    throw error;
  }

  return { data, error: null };
};

export const updateAsset = async (id: string, updates: AssetUpdate) => {
  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating asset:", error);
    throw error;
  }

  return { data, error: null };
};

export const deleteAsset = async (id: string) => {
  const { error } = await supabase.from("assets").delete().eq("id", id);

  if (error) {
    console.error("Error deleting asset:", error);
    throw error;
  }

  return { error: null };
};
