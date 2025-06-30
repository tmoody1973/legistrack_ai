import { supabase } from '../lib/supabase';

export interface BillSubject {
  id: string;
  name: string;
  type: 'legislative' | 'policy';
  count: number;
  update_date?: string;
}

export class SubjectImportService {
  private static readonly CONGRESS_API_BASE = 'https://api.congress.gov/v3';
  private static readonly API_KEY = import.meta.env.VITE_CONGRESS_API_KEY;

  static async importAllSubjects(): Promise<void> {
    if (!this.API_KEY) {
      throw new Error('Congress API key not configured');
    }

    try {
      console.log('🔄 Starting subject import...');
      
      // Import legislative subjects
      await this.importLegislativeSubjects();
      
      // Import policy areas
      await this.importPolicyAreas();
      
      console.log('✅ Subject import completed successfully');
    } catch (error) {
      console.error('❌ Error importing subjects:', error);
      throw error;
    }
  }

  private static async importLegislativeSubjects(): Promise<void> {
    try {
      const response = await fetch(
        `${this.CONGRESS_API_BASE}/bill/subjects?format=json&api_key=${this.API_KEY}&limit=250`
      );

      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const subjects = data.subjects || [];

      console.log(`📥 Processing ${subjects.length} legislative subjects...`);

      const subjectData: BillSubject[] = subjects.map((subject: any) => ({
        id: `legislative-${subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: subject.name,
        type: 'legislative' as const,
        count: subject.count || 0,
        update_date: subject.updateDate || new Date().toISOString()
      }));

      // Batch insert subjects
      const { error } = await supabase
        .from('bill_subjects')
        .upsert(subjectData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`✅ Imported ${subjectData.length} legislative subjects`);
    } catch (error) {
      console.error('Error importing legislative subjects:', error);
      throw error;
    }
  }

  private static async importPolicyAreas(): Promise<void> {
    try {
      const response = await fetch(
        `${this.CONGRESS_API_BASE}/bill/policy-areas?format=json&api_key=${this.API_KEY}&limit=250`
      );

      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const policyAreas = data.policyAreas || [];

      console.log(`📥 Processing ${policyAreas.length} policy areas...`);

      const policyData: BillSubject[] = policyAreas.map((policy: any) => ({
        id: `policy-${policy.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: policy.name,
        type: 'policy' as const,
        count: policy.count || 0,
        update_date: policy.updateDate || new Date().toISOString()
      }));

      // Batch insert policy areas
      const { error } = await supabase
        .from('bill_subjects')
        .upsert(policyData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`✅ Imported ${policyData.length} policy areas`);
    } catch (error) {
      console.error('Error importing policy areas:', error);
      throw error;
    }
  }

  static async updatePolicyAreasForExistingBills(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🔄 Updating policy areas for existing bills...');
      
      // Get bills without policy areas
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('id, policy_area')
        .is('policy_area', null)
        .limit(50);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'No bills found without policy areas'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills without policy areas`);
      
      let updatedCount = 0;
      
      // Process bills in batches
      const batchSize = 5;
      for (let i = 0; i < bills.length; i += batchSize) {
        const batch = bills.slice(i, i + batchSize);
        
        // Process each bill in the batch
        await Promise.all(batch.map(async (bill) => {
          try {
            // Parse bill ID
            const [congress, billType, number] = bill.id.split('-');
            
            if (!congress || !billType || !number) {
              console.warn(`Invalid bill ID format: ${bill.id}`);
              return;
            }
            
            // Fetch subjects for this bill
            const response = await fetch(
              `${this.CONGRESS_API_BASE}/bill/${congress}/${billType.toLowerCase()}/${number}/subjects?format=json&api_key=${this.API_KEY}`
            );
            
            if (!response.ok) {
              console.warn(`Error fetching subjects for bill ${bill.id}: ${response.status}`);
              return;
            }
            
            const data = await response.json();
            
            // Extract policy area
            if (data.subjects?.policyArea?.name) {
              // Update bill with policy area
              const { error: updateError } = await supabase
                .from('bills')
                .update({ 
                  policy_area: data.subjects.policyArea.name,
                  updated_at: new Date().toISOString()
                })
                .eq('id', bill.id);
              
              if (updateError) {
                console.warn(`Error updating policy area for bill ${bill.id}:`, updateError);
                return;
              }
              
              updatedCount++;
            }
          } catch (error) {
            console.warn(`Error processing bill ${bill.id}:`, error);
          }
        }));
        
        // Add a small delay between batches
        if (i + batchSize < bills.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return {
        success: true,
        count: updatedCount,
        message: `Updated policy areas for ${updatedCount} of ${bills.length} bills`
      };
    } catch (error) {
      console.error('Error updating policy areas:', error);
      return {
        success: false,
        count: 0,
        message: `Error updating policy areas: ${error.message}`
      };
    }
  }

  static async getSubjectsByType(type: 'legislative' | 'policy'): Promise<BillSubject[]> {
    const { data, error } = await supabase
      .from('bill_subjects')
      .select('*')
      .eq('type', type)
      .order('count', { ascending: false });

    if (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }

    return data || [];
  }

  static async getAllSubjects(): Promise<BillSubject[]> {
    const { data, error } = await supabase
      .from('bill_subjects')
      .select('*')
      .order('count', { ascending: false });

    if (error) {
      console.error('Error fetching all subjects:', error);
      throw error;
    }

    return data || [];
  }

  static async searchSubjects(query: string): Promise<BillSubject[]> {
    const { data, error } = await supabase
      .from('bill_subjects')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching subjects:', error);
      throw error;
    }

    return data || [];
  }
}