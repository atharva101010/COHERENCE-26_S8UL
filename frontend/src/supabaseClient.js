import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hwoywqlmyzgraosqdhxa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3l3cWxteXpncmFvc3FkaHhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc4NzM1OCwiZXhwIjoyMDg4MzYzMzU4fQ.A3ROhddqdWvhtP8U6dCTJyH3BZ_9PtSr4bL6iJVsraE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
