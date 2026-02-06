
import { createClient } from '@supabase/supabase-js';
import { Storage } from './storage';

// In a real app, these should be environment variables.
// For the purpose of this demo app structure, we try to get them from local storage config
// or use placeholders. 
// USER MUST CONFIGURE THESE IN THE ADMIN PANEL OR SOURCE CODE.

const storedConfig = Storage.get<any>('appConfig', {});

// Defaults provided by user configuration
const DEFAULT_SUPABASE_URL = "https://ijyktbybtsxkknxexftf.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqeWt0YnlidHN4a2tueGV4ZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTAxMTUsImV4cCI6MjA4NTUyNjExNX0.ks8PXhkJDUaiey4CQahf2jl_-Mo_WaDeDtwtNlttYcI";

const supabaseUrl = storedConfig?.integrations?.supabaseUrl || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = storedConfig?.integrations?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

export const isSupabaseConfigured = () => !!supabase;
