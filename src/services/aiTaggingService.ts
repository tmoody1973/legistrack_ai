import { supabase } from '../lib/supabase';
import { openaiService } from './openaiService';
import { geminiService } from './geminiService';
import type { Bill, BillSubject } from '../types';

/**
 * Service for AI-powered bill tagging
 * Analyzes bill content and assigns relevant tags with confidence scores
 */
class AITaggingService {
  private readonly MIN_CONFIDENCE_SCORE = 50; // Minimum confidence score to save a tag (0-100)
  private readonly MAX_RETRIES = 2; // Maximum number of retries for AI analysis
  private readonly BATCH_SIZE = 5; // Number of bills to process in a batch

  /**
   * Generate tags for a bill using AI
   * @param bill Bill to analyze
   * @returns Array of generated tags with confidence scores
   */
  async generateTagsForBill(bill: Bill): Promise<Array<{
    subject_id: string;
    name: string;
    confidence_score: number;
  }>> {
    try {
      console.log(`🏷️ Generating tags for bill: ${bill.id}`);
      
      // Get all available subjects for reference
      const subjects = await this.getAllSubjects();
      
      if (!subjects || subjects.length === 0) {
        console.warn('No subjects available for tagging');
        return [];
      }
      
      // Prepare bill data for analysis
      const billData = {
        id: bill.id,
        title: bill.title,
        short_title: bill.short_title,
        summary: bill.summary,
        policy_area: bill.policy_area,
        subjects: bill.subjects,
        full_text_excerpt: bill.full_text_content 
          ? bill.full_text_content.substring(0, 5000) // Limit to 5000 chars
          : null
      };
      
      // Prepare subject data for the AI
      const subjectData = subjects.map(subject => ({
        id: subject.id,
        name: subject.name,
        type: subject.type
      }));
      
      // Try to generate tags using available AI services
      let tags: Array<{
        subject_id: string;
        name: string;
        confidence_score: number;
      }> = [];
      
      // Try OpenAI first if available
      if (openaiService.isAvailable()) {
        try {
          tags = await this.generateTagsWithOpenAI(billData, subjectData);
        } catch (error) {
          console.warn('Error generating tags with OpenAI:', error);
          
          // Fall back to Gemini if available
          if (geminiService.isAvailable()) {
            tags = await this.generateTagsWithGemini(billData, subjectData);
          }
        }
      } 
      // If OpenAI not available, try Gemini
      else if (geminiService.isAvailable()) {
        tags = await this.generateTagsWithGemini(billData, subjectData);
      } else {
        console.warn('No AI service available for tag generation');
        
        // Fall back to using existing subjects and policy area
        tags = this.generateFallbackTags(bill, subjects);
      }
      
      // Filter tags by minimum confidence score
      const filteredTags = tags.filter(tag => tag.confidence_score >= this.MIN_CONFIDENCE_SCORE);
      
      console.log(`✅ Generated ${filteredTags.length} tags for bill: ${bill.id}`);
      
      return filteredTags;
    } catch (error) {
      console.error(`❌ Error generating tags for bill ${bill.id}:`, error);
      return [];
    }
  }

  /**
   * Generate tags using OpenAI
   */
  private async generateTagsWithOpenAI(
    billData: any,
    subjectData: Array<{ id: string; name: string; type: string }>
  ): Promise<Array<{ subject_id: string; name: string; confidence_score: number }>> {
    try {
      console.log('🧠 Generating tags with OpenAI...');
      
      // Create prompt for OpenAI
      const prompt = this.createTaggingPrompt(billData, subjectData);
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert legislative analyst specializing in categorizing bills by subject matter.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const text = result.choices[0].message.content;
      
      // Parse the response as JSON
      try {
        const cleanedText = this.cleanJsonResponse(text);
        const tagsData = JSON.parse(cleanedText);
        
        if (!Array.isArray(tagsData)) {
          throw new Error('Invalid response format: expected an array');
        }
        
        // Validate and transform the tags
        const validatedTags = tagsData.map(tag => ({
          subject_id: tag.subject_id,
          name: tag.name,
          confidence_score: Math.min(Math.max(Math.round(tag.confidence_score), 0), 100) // Ensure score is 0-100
        }));
        
        return validatedTags;
      } catch (parseError) {
        console.error('❌ Error parsing OpenAI response as JSON:', parseError);
        console.log('Raw response:', text);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('❌ Error generating tags with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Generate tags using Gemini
   */
  private async generateTagsWithGemini(
    billData: any,
    subjectData: Array<{ id: string; name: string; type: string }>
  ): Promise<Array<{ subject_id: string; name: string; confidence_score: number }>> {
    try {
      console.log('🧠 Generating tags with Gemini...');
      
      // Create prompt for Gemini
      const prompt = this.createTaggingPrompt(billData, subjectData);
      
      // Initialize Gemini model
      const genAI = new window.GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Generate content
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse the response as JSON
      try {
        const cleanedText = this.cleanJsonResponse(text);
        const tagsData = JSON.parse(cleanedText);
        
        if (!Array.isArray(tagsData)) {
          throw new Error('Invalid response format: expected an array');
        }
        
        // Validate and transform the tags
        const validatedTags = tagsData.map(tag => ({
          subject_id: tag.subject_id,
          name: tag.name,
          confidence_score: Math.min(Math.max(Math.round(tag.confidence_score), 0), 100) // Ensure score is 0-100
        }));
        
        return validatedTags;
      } catch (parseError) {
        console.error('❌ Error parsing Gemini response as JSON:', parseError);
        console.log('Raw response:', text);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('❌ Error generating tags with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate fallback tags based on existing bill data
   */
  private generateFallbackTags(
    bill: Bill,
    subjects: BillSubject[]
  ): Array<{ subject_id: string; name: string; confidence_score: number }> {
    const tags: Array<{ subject_id: string; name: string; confidence_score: number }> = [];
    
    // Add policy area as a tag with high confidence
    if (bill.policy_area) {
      const policySubject = subjects.find(s => 
        s.type === 'policy' && 
        s.name.toLowerCase() === bill.policy_area?.toLowerCase()
      );
      
      if (policySubject) {
        tags.push({
          subject_id: policySubject.id,
          name: policySubject.name,
          confidence_score: 90 // High confidence for policy area
        });
      }
    }
    
    // Add existing subjects as tags with medium confidence
    if (bill.subjects && bill.subjects.length > 0) {
      bill.subjects.forEach(subjectName => {
        const subject = subjects.find(s => 
          s.type === 'legislative' && 
          s.name.toLowerCase() === subjectName.toLowerCase()
        );
        
        if (subject) {
          tags.push({
            subject_id: subject.id,
            name: subject.name,
            confidence_score: 80 // Medium confidence for existing subjects
          });
        }
      });
    }
    
    return tags;
  }

  /**
   * Clean response text by removing markdown code block delimiters
   */
  private cleanJsonResponse(text: string): string {
    // Remove markdown code block delimiters
    let cleaned = text.trim();
    
    // Remove leading ```json or ```
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '');
    
    // Remove trailing ```
    cleaned = cleaned.replace(/\s*```$/, '');
    
    return cleaned.trim();
  }

  /**
   * Create a prompt for AI tagging
   */
  private createTaggingPrompt(
    billData: any,
    subjectData: Array<{ id: string; name: string; type: string }>
  ): string {
    return `
You are an expert legislative analyst. Your task is to analyze this bill and identify the most relevant subjects from the provided taxonomy.

BILL DATA:
${JSON.stringify(billData, null, 2)}

AVAILABLE SUBJECTS:
${JSON.stringify(subjectData, null, 2)}

For each subject that is relevant to this bill, assign a confidence score (0-100) indicating how strongly the bill relates to that subject.

INSTRUCTIONS:
1. Analyze the bill's title, summary, and any available text
2. Compare the bill's content against the provided subject taxonomy
3. For each relevant subject, determine a confidence score (0-100)
4. Only include subjects with meaningful relevance (don't force matches)
5. Consider both policy areas and legislative subjects
6. If the bill already has subjects or a policy area, prioritize those but don't limit yourself to them

FORMAT YOUR RESPONSE AS A JSON ARRAY with the following structure:
[
  {
    "subject_id": "policy-healthcare",
    "name": "Healthcare",
    "confidence_score": 85
  },
  {
    "subject_id": "legislative-medicare",
    "name": "Medicare",
    "confidence_score": 75
  }
]

IMPORTANT:
- Return ONLY the JSON array with no additional text
- Include the subject_id exactly as provided in the available subjects list
- Ensure confidence scores are integers between 0 and 100
- Only include subjects with a confidence score of 50 or higher
- Limit your response to the 10 most relevant subjects maximum
`;
  }

  /**
   * Save generated tags to the database
   * @param billId Bill ID
   * @param tags Array of tags with confidence scores
   * @param source Source of the tags (AI, manual, feedback)
   */
  async saveTagsForBill(
    billId: string,
    tags: Array<{ subject_id: string; name: string; confidence_score: number }>,
    source: 'AI' | 'manual' | 'feedback' = 'AI'
  ): Promise<boolean> {
    try {
      console.log(`💾 Saving ${tags.length} tags for bill: ${billId}`);
      
      if (tags.length === 0) {
        return true; // Nothing to save
      }
      
      // Prepare tags for database
      const tagsToInsert = tags.map(tag => ({
        bill_id: billId,
        subject_id: tag.subject_id,
        confidence_score: tag.confidence_score,
        source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Use upsert to handle existing tags
      const { error } = await supabase
        .from('bill_tags')
        .upsert(tagsToInsert, {
          onConflict: 'bill_id,subject_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('❌ Error saving tags:', error);
        return false;
      }
      
      console.log(`✅ Successfully saved ${tags.length} tags for bill: ${billId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving tags for bill ${billId}:`, error);
      return false;
    }
  }

  /**
   * Process a batch of bills for tagging
   * @param bills Array of bills to process
   * @param source Source of the tags (AI, manual, feedback)
   */
  async processBillBatch(
    bills: Bill[],
    source: 'AI' | 'manual' | 'feedback' = 'AI'
  ): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    message: string;
  }> {
    try {
      console.log(`🔄 Processing batch of ${bills.length} bills for tagging...`);
      
      let processed = 0;
      let failed = 0;
      
      // Process each bill in the batch
      for (const bill of bills) {
        try {
          // Generate tags for the bill
          const tags = await this.generateTagsForBill(bill);
          
          // Save tags to database
          const success = await this.saveTagsForBill(bill.id, tags, source);
          
          if (success) {
            processed++;
          } else {
            failed++;
          }
          
          // Add a small delay between bills to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Error processing bill ${bill.id}:`, error);
          failed++;
        }
      }
      
      return {
        success: true,
        processed,
        failed,
        message: `Successfully processed ${processed} of ${bills.length} bills for tagging`
      };
    } catch (error) {
      console.error('❌ Error processing bill batch:', error);
      return {
        success: false,
        processed: 0,
        failed: bills.length,
        message: `Error processing bill batch: ${error.message}`
      };
    }
  }

  /**
   * Process all bills for tagging
   * @param limit Maximum number of bills to process
   * @param skipTagged Skip bills that already have tags
   */
  async processAllBills(
    limit: number = 50,
    skipTagged: boolean = true
  ): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    message: string;
  }> {
    try {
      console.log(`🔄 Processing up to ${limit} bills for tagging...`);
      
      // Get bills to process
      let query = supabase
        .from('bills')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      // If skipping already tagged bills, add a filter
      if (skipTagged) {
        // Get bills that don't have tags
        const { data: taggedBills, error: taggedError } = await supabase
          .from('bill_tags')
          .select('bill_id')
          .limit(1000); // Get a large number of tagged bills
        
        if (!taggedError && taggedBills && taggedBills.length > 0) {
          const taggedBillIds = taggedBills.map(tag => tag.bill_id);
          query = query.not('id', 'in', `(${taggedBillIds.join(',')})`);
        }
      }
      
      const { data: bills, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (!bills || bills.length === 0) {
        return {
          success: true,
          processed: 0,
          failed: 0,
          message: 'No bills found to process'
        };
      }
      
      console.log(`📊 Found ${bills.length} bills to process`);
      
      // Process bills in batches
      let processed = 0;
      let failed = 0;
      
      for (let i = 0; i < bills.length; i += this.BATCH_SIZE) {
        const batch = bills.slice(i, i + this.BATCH_SIZE);
        console.log(`🔄 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(bills.length / this.BATCH_SIZE)}...`);
        
        const result = await this.processBillBatch(batch);
        processed += result.processed;
        failed += result.failed;
        
        // Add a delay between batches
        if (i + this.BATCH_SIZE < bills.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return {
        success: true,
        processed,
        failed,
        message: `Successfully processed ${processed} of ${bills.length} bills for tagging`
      };
    } catch (error) {
      console.error('❌ Error processing all bills:', error);
      return {
        success: false,
        processed: 0,
        failed: 0,
        message: `Error processing all bills: ${error.message}`
      };
    }
  }

  /**
   * Get all available subjects
   */
  private async getAllSubjects(): Promise<BillSubject[]> {
    try {
      const { data, error } = await supabase
        .from('bill_subjects')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }
  }

  /**
   * Get tags for a specific bill
   * @param billId Bill ID
   * @param minConfidence Minimum confidence score (0-100)
   */
  async getTagsForBill(
    billId: string,
    minConfidence: number = 0
  ): Promise<Array<{
    id: string;
    subject_id: string;
    name: string;
    type: 'legislative' | 'policy';
    confidence_score: number;
    source: string;
  }>> {
    try {
      // Join bill_tags with bill_subjects to get subject names and types
      const { data, error } = await supabase
        .from('bill_tags')
        .select(`
          id,
          subject_id,
          confidence_score,
          source,
          bill_subjects (
            name,
            type
          )
        `)
        .eq('bill_id', billId)
        .gte('confidence_score', minConfidence)
        .order('confidence_score', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Transform the data to a more usable format
      return (data || []).map(tag => ({
        id: tag.id,
        subject_id: tag.subject_id,
        name: tag.bill_subjects?.name || '',
        type: tag.bill_subjects?.type as 'legislative' | 'policy',
        confidence_score: tag.confidence_score,
        source: tag.source
      }));
    } catch (error) {
      console.error(`Error fetching tags for bill ${billId}:`, error);
      return [];
    }
  }

  /**
   * Submit user feedback on tag accuracy
   * @param tagId Tag ID
   * @param isAccurate Whether the tag is accurate
   */
  async submitTagFeedback(
    tagId: string,
    isAccurate: boolean
  ): Promise<boolean> {
    try {
      // Get current feedback data
      const { data: currentTag, error: fetchError } = await supabase
        .from('bill_tags')
        .select('user_feedback')
        .eq('id', tagId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Update feedback data
      const currentFeedback = currentTag?.user_feedback || {
        accurate: null,
        feedback_count: 0,
        last_feedback: null
      };
      
      const newFeedbackCount = (currentFeedback.feedback_count || 0) + 1;
      
      // Calculate new accuracy based on weighted average
      let newAccuracy: boolean | null = isAccurate;
      if (currentFeedback.accurate !== null && currentFeedback.feedback_count > 0) {
        // If previous feedback exists, calculate weighted value
        const previousWeight = currentFeedback.feedback_count / newFeedbackCount;
        const newWeight = 1 / newFeedbackCount;
        
        // Convert boolean to number for calculation
        const previousValue = currentFeedback.accurate ? 1 : 0;
        const newValue = isAccurate ? 1 : 0;
        
        // Calculate weighted average
        const weightedAverage = (previousValue * previousWeight) + (newValue * newWeight);
        
        // Convert back to boolean (threshold at 0.5)
        newAccuracy = weightedAverage >= 0.5;
      }
      
      // Update the tag with new feedback
      const { error: updateError } = await supabase
        .from('bill_tags')
        .update({
          user_feedback: {
            accurate: newAccuracy,
            feedback_count: newFeedbackCount,
            last_feedback: new Date().toISOString()
          },
          // If feedback indicates the tag is inaccurate and this is the first feedback,
          // reduce the confidence score
          ...(isAccurate === false && currentFeedback.feedback_count === 0 
            ? { confidence_score: Math.max(0, (currentTag?.confidence_score || 0) - 20) } 
            : {})
        })
        .eq('id', tagId);
      
      if (updateError) {
        throw updateError;
      }
      
      return true;
    } catch (error) {
      console.error(`Error submitting feedback for tag ${tagId}:`, error);
      return false;
    }
  }

  /**
   * Get bills by subject
   * @param subjectId Subject ID
   * @param minConfidence Minimum confidence score (0-100)
   * @param limit Maximum number of bills to return
   */
  async getBillsBySubject(
    subjectId: string,
    minConfidence: number = 70,
    limit: number = 20
  ): Promise<Bill[]> {
    try {
      // Get bill IDs with this subject
      const { data: tagData, error: tagError } = await supabase
        .from('bill_tags')
        .select('bill_id, confidence_score')
        .eq('subject_id', subjectId)
        .gte('confidence_score', minConfidence)
        .order('confidence_score', { ascending: false })
        .limit(limit);
      
      if (tagError) {
        throw tagError;
      }
      
      if (!tagData || tagData.length === 0) {
        return [];
      }
      
      // Get the bills
      const billIds = tagData.map(tag => tag.bill_id);
      
      const { data: bills, error: billError } = await supabase
        .from('bills')
        .select('*')
        .in('id', billIds)
        .order('updated_at', { ascending: false });
      
      if (billError) {
        throw billError;
      }
      
      return bills || [];
    } catch (error) {
      console.error(`Error fetching bills for subject ${subjectId}:`, error);
      return [];
    }
  }

  /**
   * Get bills matching user interests
   * @param interests Array of user interests
   * @param minConfidence Minimum confidence score (0-100)
   * @param limit Maximum number of bills to return
   * @param requireAllInterests Whether to require all interests to match (AND) or any interest (OR)
   */
  async getBillsByUserInterests(
    interests: string[],
    minConfidence: number = 70,
    limit: number = 20,
    requireAllInterests: boolean = false
  ): Promise<Bill[]> {
    try {
      if (!interests || interests.length === 0) {
        return [];
      }
      
      // First, find subject IDs that match the user's interests
      const { data: matchingSubjects, error: subjectError } = await supabase
        .from('bill_subjects')
        .select('id, name')
        .or(interests.map(interest => `name.ilike.%${interest}%`).join(','));
      
      if (subjectError) {
        throw subjectError;
      }
      
      if (!matchingSubjects || matchingSubjects.length === 0) {
        return [];
      }
      
      const subjectIds = matchingSubjects.map(subject => subject.id);
      
      // Get bill IDs with these subjects
      const { data: tagData, error: tagError } = await supabase
        .from('bill_tags')
        .select('bill_id, subject_id, confidence_score')
        .in('subject_id', subjectIds)
        .gte('confidence_score', minConfidence);
      
      if (tagError) {
        throw tagError;
      }
      
      if (!tagData || tagData.length === 0) {
        return [];
      }
      
      // Group tags by bill ID
      const billTagsMap = new Map<string, { subject_ids: Set<string>, max_confidence: number }>();
      
      tagData.forEach(tag => {
        if (!billTagsMap.has(tag.bill_id)) {
          billTagsMap.set(tag.bill_id, { 
            subject_ids: new Set([tag.subject_id]),
            max_confidence: tag.confidence_score
          });
        } else {
          const entry = billTagsMap.get(tag.bill_id)!;
          entry.subject_ids.add(tag.subject_id);
          entry.max_confidence = Math.max(entry.max_confidence, tag.confidence_score);
        }
      });
      
      // Filter bills based on matching criteria
      let matchingBillIds: string[] = [];
      
      if (requireAllInterests) {
        // AND logic: Bill must match all interests
        // For each bill, check if it has tags for all subject IDs
        matchingBillIds = Array.from(billTagsMap.entries())
          .filter(([_, data]) => {
            // Check if the bill has at least one tag for each interest
            return subjectIds.every(subjectId => data.subject_ids.has(subjectId));
          })
          .map(([billId, _]) => billId);
      } else {
        // OR logic: Bill can match any interest
        // Sort by confidence score
        matchingBillIds = Array.from(billTagsMap.entries())
          .sort((a, b) => b[1].max_confidence - a[1].max_confidence)
          .map(([billId, _]) => billId)
          .slice(0, limit);
      }
      
      if (matchingBillIds.length === 0) {
        return [];
      }
      
      // Get the bills
      const { data: bills, error: billError } = await supabase
        .from('bills')
        .select('*')
        .in('id', matchingBillIds)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (billError) {
        throw billError;
      }
      
      return bills || [];
    } catch (error) {
      console.error('Error fetching bills by user interests:', error);
      return [];
    }
  }
}

export const aiTaggingService = new AITaggingService();