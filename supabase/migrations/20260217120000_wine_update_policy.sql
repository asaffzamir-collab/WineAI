-- Allow authenticated users to update wine records
-- This is needed so the API can enrich existing wine data with
-- image_url, serving, and food_pairings from newer searches.
CREATE POLICY "Authenticated users can update wines" ON wines
  FOR UPDATE USING (true) WITH CHECK (true);
