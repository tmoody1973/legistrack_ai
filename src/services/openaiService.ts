import { supabase } from '../lib/supabase';
import type { Bill } from '../types';

class OpenAIService {
  private apiKey: string;
  private readonly MODEL_NAME = 'gpt-4o';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not found. AI features will be disabled.');
    } else {
      console.log('✅ OpenAI API key found. AI features are enabled.');
    }
  }

  /**
   * Check if the OpenAI API is available
   * @returns True if the API is available, false otherwise
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate bill analysis with retry logic
   * @param bill Bill to analyze
   * @param userContext User context for personalization
   * @returns AI analysis object
   */
  async generateBillAnalysis(bill: Bill, userContext?: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        console.log(`🧠 Generating AI analysis for bill ${bill.id} (attempt ${retries + 1})...`);
        
        // Prepare prompt with bill data
        const prompt = this.createBillAnalysisPrompt(bill, userContext);
        
        // Generate content
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.MODEL_NAME,
            messages: [
              { role: 'system', content: 'You are an expert legislative analyst with deep knowledge of the U.S. Congress and legislative process.' },
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
          const analysisData = JSON.parse(cleanedText);
          console.log('✅ Successfully generated AI analysis');
          
          // Update bill in database with analysis
          await this.saveBillAnalysis(bill.id, analysisData);
          
          return analysisData;
        } catch (parseError) {
          console.error('❌ Error parsing AI response as JSON:', parseError);
          console.log('Raw response:', text);
          throw new Error('Invalid response format from AI service');
        }
      } catch (error) {
        retries++;
        console.error(`❌ Error generating AI analysis (attempt ${retries}):`, error);
        
        if (retries >= this.MAX_RETRIES) {
          throw new Error(`Failed to generate AI analysis after ${this.MAX_RETRIES} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
      }
    }

    throw new Error('Failed to generate AI analysis');
  }

  /**
   * Generate bill analysis with enhanced context
   * @param bill Bill to analyze
   * @param userContext User context for personalization
   * @returns AI analysis object with enhanced context
   */
  async generateBillAnalysisWithEnhancedContext(bill: Bill, userContext?: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        console.log(`🧠 Generating AI analysis with enhanced context for bill ${bill.id} (attempt ${retries + 1})...`);
        
        // Create prompt for enhanced analysis
        const prompt = this.createBillAnalysisWithEnhancedContextPrompt(bill, userContext);
        
        // Generate content
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.MODEL_NAME,
            messages: [
              { role: 'system', content: 'You are an expert legislative analyst with deep knowledge of U.S. legislation and Congress.' },
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
          const analysisData = JSON.parse(cleanedText);
          console.log('✅ Successfully generated AI analysis with enhanced context');
          
          // Update bill in database with analysis
          await this.saveBillAnalysis(bill.id, analysisData);
          
          return analysisData;
        } catch (parseError) {
          console.error('❌ Error parsing AI response as JSON:', parseError);
          console.log('Raw response:', text);
          throw new Error('Invalid response format from AI service');
        }
      } catch (error) {
        retries++;
        console.error(`❌ Error generating AI analysis with enhanced context (attempt ${retries}):`, error);
        
        if (retries >= this.MAX_RETRIES) {
          throw new Error(`Failed to generate AI analysis with enhanced context after ${this.MAX_RETRIES} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
      }
    }

    throw new Error('Failed to generate AI analysis with enhanced context');
  }

  /**
   * Generate a podcast overview from comprehensive analysis and save it to the bill.
   * @param bill Bill to generate overview for.
   * @returns The generated podcast overview text.
   */
  async generatePodcastOverview(bill: Bill): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    try {
      console.log(`🎙️ Generating podcast overview for bill ${bill.id}...`);

      // 1. Get the comprehensive analysis for the bill
      let comprehensiveAnalysis = bill.comprehensive_analysis;
      
      // If not already attached to the bill, fetch it from the database
      if (!comprehensiveAnalysis) {
        comprehensiveAnalysis = await this.getComprehensiveAnalysis(bill.id);
      }

      if (!comprehensiveAnalysis) {
        throw new Error(`Comprehensive analysis not found for bill ${bill.id}. Cannot generate podcast overview.`);
      }

      // Extract relevant parts for the podcast overview
      const executiveSummary = comprehensiveAnalysis.executiveSummary || bill.summary || 'No summary available.';
      const keyProvisions = comprehensiveAnalysis.keyProvisions?.map((p: any) => p.title || p.description).join('; ') || 'No key provisions available.';
      const potentialOutcomes = comprehensiveAnalysis.potentialOutcomes?.ifPassed || 'Potential outcomes not detailed.';
      
      // NEW: Extract additional sections for expanded overview
      const politicalLandscape = comprehensiveAnalysis.politicalLandscape ? 
        `Support: ${comprehensiveAnalysis.politicalLandscape.support?.join(', ') || 'Not specified'}. ` +
        `Opposition: ${comprehensiveAnalysis.politicalLandscape.opposition?.join(', ') || 'Not specified'}. ` +
        `Key Factors: ${comprehensiveAnalysis.politicalLandscape.keyFactors?.join(', ') || 'Not specified'}.` : 
        'Political landscape not detailed.';
      
      const stakeholderImpact = comprehensiveAnalysis.stakeholderImpact ? 
        `Citizens: ${comprehensiveAnalysis.stakeholderImpact.citizens || 'Not specified'}. ` +
        `Businesses: ${comprehensiveAnalysis.stakeholderImpact.businesses || 'Not specified'}. ` +
        `Government: ${comprehensiveAnalysis.stakeholderImpact.government || 'Not specified'}.` : 
        'Stakeholder impact not detailed.';
      
      const implementationAnalysis = comprehensiveAnalysis.implementationAnalysis ? 
        `Timeline: ${comprehensiveAnalysis.implementationAnalysis.timeline || 'Not specified'}. ` +
        `Challenges: ${comprehensiveAnalysis.implementationAnalysis.challenges?.join(', ') || 'Not specified'}. ` +
        `Agencies: ${comprehensiveAnalysis.implementationAnalysis.agencies?.join(', ') || 'Not specified'}.` : 
        'Implementation analysis not detailed.';

      const prompt = `
You are a podcast host creating a comprehensive overview for an episode about a new legislative bill.
Your goal is to make the bill sound engaging and easy to understand for a general audience while providing substantive analysis.

Here is the comprehensive analysis of the bill:
Executive Summary: ${executiveSummary}

Key Provisions: ${keyProvisions}

Political Landscape: ${politicalLandscape}

Stakeholder Impact: ${stakeholderImpact}

Implementation Analysis: ${implementationAnalysis}

Potential Outcomes (if passed): ${potentialOutcomes}

Create an engaging, informative podcast overview (around 300-450 words, suitable for a 2-3 minute segment).
Structure your overview to include:
1. An attention-grabbing introduction to the bill and its significance
2. A clear explanation of the bill's core purpose and key provisions
3. Analysis of the political landscape and likelihood of passage
4. Discussion of stakeholder impacts (citizens, businesses, government)
5. Implementation timeline and challenges
6. Potential outcomes and broader implications

Use a conversational, engaging tone appropriate for audio. Avoid complex jargon and explain technical terms.
Do not include a call to action or ask questions. Just provide the overview as if you're speaking to listeners.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are a concise and engaging podcast host.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 600 // Increased token limit for longer overview
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const podcastOverview = result.choices[0].message.content;

      // 2. Save the generated overview to the bills table
      await this.savePodcastOverview(bill.id, podcastOverview);

      console.log('✅ Successfully generated and saved podcast overview.');
      return podcastOverview;
    } catch (error) {
      console.error('❌ Error generating podcast overview:', error);
      throw new Error(`Failed to generate podcast overview: ${error.message}`);
    }
  }

  /**
   * Saves the generated podcast overview to the bills table.
   * @param billId The ID of the bill.
   * @param overview The podcast overview text.
   */
  async savePodcastOverview(billId: string, overview: string): Promise<void> {
    try {
      console.log(`💾 Saving podcast overview for bill ${billId} to database...`);

      const { error } = await supabase
        .from('bills')
        .update({
          podcast_overview: overview,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not save podcast overview for bill ${billId}:`, error);
      } else {
        console.log(`✅ Successfully saved podcast overview for bill ${billId}`);
      }
    } catch (error) {
      console.warn(`Error saving podcast overview for bill ${billId}:`, error);
    }
  }

  /**
   * Clean response text by removing markdown code block delimiters
   * @param text Raw response text
   * @returns Cleaned JSON string
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
   * Create a prompt for bill analysis
   * @param bill Bill to analyze
   * @param userContext User context for personalization
   * @returns Prompt string
   */
  private createBillAnalysisPrompt(bill: Bill, userContext?: any): string {
    // Prepare bill data
    const billData = {
      id: bill.id,
      congress: bill.congress,
      bill_type: bill.bill_type,
      number: bill.number,
      title: bill.title,
      shortTitle: bill.short_title,
      summary: bill.summary || 'No summary available',
      sponsors: bill.sponsors?.map(s => `${s.full_name} (${s.party}-${s.state})`) || [],
      subjects: bill.subjects || [],
      policyArea: bill.policy_area,
      status: bill.status,
      introducedDate: bill.introduced_date,
      latestAction: bill.latest_action?.text
    };

    // Include full text content if available (truncated if too long)
    let fullTextExcerpt = '';
    if (bill.full_text_content) {
      // Limit to first 10,000 characters to avoid token limits
      fullTextExcerpt = bill.full_text_content.substring(0, 10000);
      if (bill.full_text_content.length > 10000) {
        fullTextExcerpt += '... [text truncated]';
      }
    }

    // Prepare user context if available
    const userContextData = userContext ? {
      location: userContext.location || {},
      interests: userContext.interests || [],
      demographics: userContext.demographics || {}
    } : null;

    // Create the prompt
    return `
Analyze the following bill and provide a comprehensive analysis in JSON format:

BILL DATA:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

${userContextData ? `USER CONTEXT:
${JSON.stringify(userContextData, null, 2)}` : ''}

Your analysis should include:
1. A plain English summary (5-10 sentences)
2. Key provisions (5-7 bullet points)
3. Impact assessment (economic, social, regional, demographic)
4. Passage prediction (probability as decimal 0-1, reasoning, key factors, timeline)

Format your response as a valid JSON object with the following structure:
{
  "summary": "Plain English summary here...",
  "keyProvisions": ["Provision 1", "Provision 2", "Provision 3"],
  "impactAssessment": {
    "economic": "Economic impact analysis...",
    "social": "Social impact analysis...",
    "regional": "Regional impact analysis...",
    "demographic": "Demographic impact analysis..."
  },
  "passagePrediction": {
    "probability": 0.65,
    "reasoning": "Reasoning for prediction...",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3"],
    "timeline": "Expected timeline..."
  }
}

IMPORTANT: Ensure your response is ONLY the JSON object with no additional text before or after.
`;
  }

  /**
   * Create a prompt for bill analysis with enhanced context
   * @param bill Bill to analyze
   * @param userContext User context for personalization
   * @returns Prompt string
   */
  private createBillAnalysisWithEnhancedContextPrompt(bill: Bill, userContext?: any): string {
    // Prepare bill data
    const billData = {
      id: bill.id,
      congress: bill.congress,
      bill_type: bill.bill_type,
      number: bill.number,
      title: bill.title,
      shortTitle: bill.short_title,
      summary: bill.summary || 'No summary available',
      sponsors: bill.sponsors?.map(s => `${s.full_name} (${s.party}-${s.state})`) || [],
      subjects: bill.subjects || [],
      policyArea: bill.policy_area,
      status: bill.status,
      introducedDate: bill.introduced_date,
      latestAction: bill.latest_action?.text
    };

    // Include full text content if available (truncated if too long)
    let fullTextExcerpt = '';
    if (bill.full_text_content) {
      // Limit to first 5,000 characters to avoid token limits
      fullTextExcerpt = bill.full_text_content.substring(0, 5000);
      if (bill.full_text_content.length > 5000) {
        fullTextExcerpt += '... [text truncated]';
      }
    }

    // Prepare user context if available
    const userContextData = userContext ? {
      location: userContext.location || {},
      interests: userContext.interests || [],
      demographics: userContext.demographics || {}
    } : null;

    // Create the prompt
    return `
Please analyze the following bill and provide a comprehensive analysis using your extensive knowledge of U.S. legislation and current political context:

BILL DATA:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

${userContextData ? `USER CONTEXT:
${JSON.stringify(userContextData, null, 2)}` : ''}

Your analysis should include:
1. A plain English summary (3-5 sentences) that incorporates current legislative context
2. Key provisions (3-5 bullet points) based on the bill text and your knowledge
3. Impact assessment (economic, social, regional, demographic) using your understanding of policy implications
4. Passage prediction (probability as decimal 0-1, reasoning, key factors, timeline) based on current political climate

Format your response as a valid JSON object with the following structure:
{
  "summary": "Plain English summary here...",
  "keyProvisions": ["Provision 1", "Provision 2", "Provision 3"],
  "impactAssessment": {
    "economic": "Economic impact analysis...",
    "social": "Social impact analysis...",
    "regional": "Regional impact analysis...",
    "demographic": "Demographic impact analysis..."
  },
  "passagePrediction": {
    "probability": 0.65,
    "reasoning": "Reasoning for prediction...",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3"],
    "timeline": "Expected timeline..."
  },
  "contextualAnalysis": "Analysis based on current legislative context and trends..."
}

IMPORTANT: Ensure your response is ONLY the JSON object with no additional text before or after.
`;
  }

  /**
   * Generate a summary of bill full text using enhanced analysis
   * @param bill Bill to summarize
   * @returns Summary text
   */
  async generateBillFullTextSummary(bill: Bill): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    try {
      console.log(`🧠 Generating full text summary for bill ${bill.id}...`);
      
      // Create prompt for full text summary
      const prompt = `
You are an expert legislative analyst. I need you to create a comprehensive summary of the full text of this bill:

Bill: ${bill.bill_type} ${bill.number} (${bill.congress}th Congress)
Title: ${bill.title}
${bill.short_title ? `Short Title: ${bill.short_title}` : ''}

Please create a detailed summary that covers:
1. The main purpose and objectives of the bill
2. Key provisions and sections
3. Any notable amendments or changes
4. Technical details that would be important for understanding the bill

Your summary should be thorough but accessible to an educated general audience.
Aim for 3-5 paragraphs that capture the essence of the bill's full text.
`;
      
      // Generate content
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are an expert legislative analyst with deep knowledge of U.S. legislation and Congress.' },
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
      const summary = result.choices[0].message.content;
      console.log('✅ Successfully generated full text summary');
      
      // Update bill in database with the summary
      await this.updateBillSummary(bill.id, summary);
      
      return summary;
    } catch (error) {
      console.error('❌ Error generating full text summary:', error);
      throw error;
    }
  }

  /**
   * Update bill summary in database
   * @param billId Bill ID
   * @param summary Summary text
   */
  private async updateBillSummary(billId: string, summary: string): Promise<void> {
    try {
      if (!summary) return;
      
      console.log(`💾 Updating summary for bill ${billId}...`);

      const { error } = await supabase
        .from('bills')
        .update({ 
          summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not update summary for bill ${billId}:`, error);
      } else {
        console.log(`✅ Successfully updated summary for bill ${billId}`);
      }
    } catch (error) {
      console.warn(`Error updating summary for bill ${billId}:`, error);
    }
  }

  /**
   * Save bill analysis to database
   * @param billId Bill ID
   * @param analysis Analysis data
   */
  private async saveBillAnalysis(billId: string, analysis: any): Promise<void> {
    try {
      console.log(`💾 Saving AI analysis for bill ${billId} to database...`);

      // Add generated_at timestamp
      const analysisWithTimestamp = {
        ...analysis,
        generated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('bills')
        .update({ 
          ai_analysis: analysisWithTimestamp,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) {
        console.warn(`Could not save AI analysis for bill ${billId}:`, error);
      } else {
        console.log(`✅ Successfully saved AI analysis for bill ${billId}`);
      }
    } catch (error) {
      console.warn(`Error saving AI analysis for bill ${billId}:`, error);
    }
  }

  /**
   * Generate a response to a user's question about a bill
   * @param question User's question
   * @param bill Bill context
   * @param chatHistory Previous chat history
   * @returns AI response
   */
  async generateBillChatResponse(
    question: string, 
    bill: Bill, 
    chatHistory: { role: 'user' | 'model'; content: string }[] = []
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    try {
      console.log(`🧠 Generating chat response for question about bill ${bill.id}...`);
      
      // Create context-aware prompt
      const prompt = this.createBillChatPrompt(question, bill);
      
      // Prepare chat history for the model
      const messages = [
        { role: 'system', content: 'You are an expert legislative assistant who helps users understand bills in Congress.' },
        ...chatHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: prompt }
      ];
      
      // Generate response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const text = result.choices[0].message.content;
      
      console.log('✅ Successfully generated chat response');
      return text;
    } catch (error) {
      console.error('❌ Error generating chat response:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Create a prompt for bill chat
   * @param question User's question
   * @param bill Bill context
   * @returns Prompt string
   */
  private createBillChatPrompt(question: string, bill: Bill): string {
    // Prepare bill data
    const billData = {
      id: bill.id,
      congress: bill.congress,
      bill_type: bill.bill_type,
      number: bill.number,
      title: bill.title,
      shortTitle: bill.short_title,
      summary: bill.summary || 'No summary available',
      sponsors: bill.sponsors?.map(s => `${s.full_name} (${s.party}-${s.state})`) || [],
      subjects: bill.subjects || [],
      policyArea: bill.policy_area,
      status: bill.status,
      introducedDate: bill.introduced_date,
      latestAction: bill.latest_action?.text,
      aiAnalysis: bill.ai_analysis
    };

    // Include full text content if available (truncated if too long)
    let fullTextExcerpt = '';
    if (bill.full_text_content) {
      // Limit to first 5,000 characters to avoid token limits
      fullTextExcerpt = bill.full_text_content.substring(0, 5000);
      if (bill.full_text_content.length > 5000) {
        fullTextExcerpt += '... [text truncated]';
      }
    }

    return `
BILL CONTEXT:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

USER QUESTION:
${question}

Please provide a helpful, accurate, and concise response to the user's question about this bill.
Focus on answering exactly what was asked, using the bill information provided.
If you don't know the answer, say so honestly rather than making up information.
Use plain, accessible language that a general audience can understand.
`;
  }

  /**
   * Generate follow-up question suggestions based on a bill
   * @param bill Bill to generate suggestions for
   * @returns Array of suggested follow-up questions
   */
  async generateFollowUpQuestions(bill: Bill): Promise<string[]> {
    if (!this.isAvailable()) {
      return [
        "What are the key provisions of this bill?",
        "Who sponsored this bill?",
        "What's the current status of this bill?",
        "How likely is this bill to pass?",
        "How would this bill affect me?"
      ];
    }

    try {
      console.log(`🧠 Generating follow-up questions for bill ${bill.id}...`);
      
      // Prepare bill data
      const billData = {
        id: bill.id,
        congress: bill.congress,
        bill_type: bill.bill_type,
        number: bill.number,
        title: bill.title,
        shortTitle: bill.short_title,
        summary: bill.summary?.substring(0, 500) || 'No summary available',
        sponsors: bill.sponsors?.map(s => `${s.full_name} (${s.party}-${s.state})`) || [],
        subjects: bill.subjects || [],
        policyArea: bill.policy_area,
        status: bill.status,
        introducedDate: bill.introduced_date,
        latestAction: bill.latest_action?.text
      };

      // Include full text excerpt if available
      let fullTextExcerpt = '';
      if (bill.full_text_content) {
        // Limit to first 1,000 characters for follow-up questions
        fullTextExcerpt = bill.full_text_content.substring(0, 1000);
        if (bill.full_text_content.length > 1000) {
          fullTextExcerpt += '... [text truncated]';
        }
      }
      
      // Prepare prompt
      const prompt = `
You are an expert legislative assistant. Generate 5 relevant follow-up questions that a user might want to ask about this bill:

BILL DATA:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

Generate 5 specific, relevant follow-up questions that would help a user better understand this bill.
Format your response as a JSON array of strings, with no additional text.
Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
`;
      
      // Generate content
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are an expert legislative assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
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
        const questions = JSON.parse(cleanedText);
        if (Array.isArray(questions) && questions.length > 0) {
          return questions.slice(0, 5); // Ensure we only return 5 questions
        }
      } catch (parseError) {
        console.error('❌ Error parsing follow-up questions as JSON:', parseError);
      }
      
      // Fallback to default questions
      return [
        "What are the key provisions of this bill?",
        "Who sponsored this bill?",
        "What's the current status of this bill?",
        "How likely is this bill to pass?",
        "How would this bill affect me?"
      ];
    } catch (error) {
      console.error('❌ Error generating follow-up questions:', error);
      
      // Return default questions on error
      return [
        "What are the key provisions of this bill?",
        "Who sponsored this bill?",
        "What's the current status of this bill?",
        "How likely is this bill to pass?",
        "How would this bill affect me?"
      ];
    }
  }

  /**
   * Generate a personalized impact assessment for a bill based on user profile
   * @param bill Bill to analyze
   * @param userProfile User profile data
   * @returns Personalized impact assessment
   */
  async generatePersonalizedImpact(bill: Bill, userProfile: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    try {
      console.log(`🧠 Generating personalized impact for bill ${bill.id}...`);
      
      // Prepare bill data
      const billData = {
        id: bill.id,
        congress: bill.congress,
        bill_type: bill.bill_type,
        number: bill.number,
        title: bill.title,
        shortTitle: bill.short_title,
        summary: bill.summary || 'No summary available',
        subjects: bill.subjects || [],
        policyArea: bill.policy_area,
        aiAnalysis: bill.ai_analysis
      };

      // Include full text excerpt if available
      let fullTextExcerpt = '';
      if (bill.full_text_content) {
        // Limit to first 5,000 characters for personalized impact
        fullTextExcerpt = bill.full_text_content.substring(0, 5000);
        if (bill.full_text_content.length > 5000) {
          fullTextExcerpt += '... [text truncated]';
        }
      }
      
      // Prepare prompt
      const prompt = `
You are an expert legislative analyst. Generate a personalized impact assessment for how this bill might affect this specific user:

BILL DATA:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

Generate a personalized impact assessment that explains how this bill might specifically affect this user based on their location, demographics, and interests.

Format your response as a JSON object with the following structure:
{
  "personalImpact": "Detailed explanation of how this bill might affect this specific user...",
  "relevanceScore": 85, // 0-100 score indicating how relevant this bill is to the user
  "keyPoints": ["Point 1", "Point 2", "Point 3"], // 2-3 key points about personal impact
  "recommendedAction": "Suggested action the user might want to take..."
}

IMPORTANT: Ensure your response is ONLY the JSON object with no additional text before or after.
`;
      
      // Generate content
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are an expert legislative analyst.' },
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
        const impact = JSON.parse(cleanedText);
        console.log('✅ Successfully generated personalized impact assessment');
        return impact;
      } catch (parseError) {
        console.error('❌ Error parsing personalized impact as JSON:', parseError);
        console.log('Raw response:', text);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('❌ Error generating personalized impact:', error);
      throw new Error(`Failed to generate personalized impact: ${error.message}`);
    }
  }

  /**
   * Generate a comparison analysis between multiple bills
   * @param bills Array of bills to compare
   * @returns Comparison analysis
   */
  async generateBillComparison(bills: Bill[]): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    if (bills.length < 2) {
      throw new Error('At least two bills are required for comparison');
    }

    try {
      console.log(`🧠 Generating comparison analysis for ${bills.length} bills...`);
      
      // Prepare bill data
      const billsData = bills.map(bill => ({
        id: bill.id,
        congress: bill.congress,
        bill_type: bill.bill_type,
        number: bill.number,
        title: bill.title,
        shortTitle: bill.short_title,
        summary: bill.summary?.substring(0, 500) || 'No summary available',
        sponsors: bill.sponsors?.map(s => `${s.full_name} (${s.party}-${s.state})`) || [],
        subjects: bill.subjects || [],
        policyArea: bill.policy_area,
        status: bill.status,
        introducedDate: bill.introduced_date,
        latestAction: bill.latest_action?.text,
        // Include a short excerpt of full text if available
        fullTextExcerpt: bill.full_text_content 
          ? bill.full_text_content.substring(0, 1000) + (bill.full_text_content.length > 1000 ? '...' : '')
          : null
      }));
      
      // Prepare prompt
      const prompt = `
You are an expert legislative analyst. Compare the following bills and provide a comprehensive analysis of their similarities, differences, and relative merits:

BILLS TO COMPARE:
${JSON.stringify(billsData, null, 2)}

Generate a detailed comparison that highlights key similarities and differences between these bills, their approaches to the issue, and their relative strengths and weaknesses.

Format your response as a JSON object with the following structure:
{
  "commonGoal": "Description of what these bills are trying to achieve...",
  "keyDifferences": [
    "Difference 1...",
    "Difference 2...",
    "Difference 3..."
  ],
  "approachComparison": {
    "bill1": "Analysis of first bill's approach...",
    "bill2": "Analysis of second bill's approach..."
  },
  "strengthsAndWeaknesses": {
    "bill1": {
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    },
    "bill2": {
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    }
  },
  "recommendation": "Overall assessment of which bill might be more effective and why..."
}

IMPORTANT: Ensure your response is ONLY the JSON object with no additional text before or after.
`;
      
      // Generate content
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are an expert legislative analyst.' },
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
        const comparison = JSON.parse(cleanedText);
        console.log('✅ Successfully generated bill comparison');
        return comparison;
      } catch (parseError) {
        console.error('❌ Error parsing bill comparison as JSON:', parseError);
        console.log('Raw response:', text);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('❌ Error generating bill comparison:', error);
      throw new Error(`Failed to generate bill comparison: ${error.message}`);
    }
  }

  /**
   * Generate a comprehensive bill summary with detailed analysis
   * @param bill Bill to analyze
   * @returns Comprehensive analysis object
   */
  async generateComprehensiveAnalysis(bill: Bill): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    try {
      console.log(`🧠 Generating comprehensive analysis for bill ${bill.id}...`);
      
      // Prepare bill data
      const billData = {
        id: bill.id,
        congress: bill.congress,
        bill_type: bill.bill_type,
        number: bill.number,
        title: bill.title,
        shortTitle: bill.short_title,
        summary: bill.summary || 'No summary available',
        sponsors: bill.sponsors?.map(s => `${s.full_name} (${s.party}-${s.state})`) || [],
        subjects: bill.subjects || [],
        policyArea: bill.policy_area,
        status: bill.status,
        introducedDate: bill.introduced_date,
        latestAction: bill.latest_action?.text,
        aiAnalysis: bill.ai_analysis
      };

      // Include full text excerpt if available
      let fullTextExcerpt = '';
      if (bill.full_text_content) {
        // Limit to first 8,000 characters for comprehensive analysis
        fullTextExcerpt = bill.full_text_content.substring(0, 8000);
        if (bill.full_text_content.length > 8000) {
          fullTextExcerpt += '... [text truncated]';
        }
      }
      
      // Prepare prompt
      const prompt = `
You are an expert legislative analyst with deep knowledge of U.S. legislation, policy, and political context. Create a comprehensive analysis of this bill that would be valuable for citizens trying to understand its significance:

BILL DATA:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

Provide a detailed analytical summary that includes:

1. Executive Summary: A clear, concise overview of the bill's purpose and significance (2-3 paragraphs)
2. Historical Context: How this bill relates to previous legislation or ongoing policy discussions
3. Key Provisions Analysis: Detailed breakdown of the most important sections with their implications
4. Stakeholder Impact: How this bill would affect different groups (citizens, businesses, government agencies)
5. Political Landscape: Current support/opposition and factors affecting passage
6. Implementation Analysis: How and when the bill would be implemented if passed
7. Expert Perspectives: What policy experts and relevant organizations are saying about this bill
8. Potential Outcomes: Best and worst case scenarios if the bill passes or fails

Format your response as a valid JSON object with the following structure:
{
  "executiveSummary": "Comprehensive overview of the bill...",
  "historicalContext": "Analysis of how this bill fits into legislative history...",
  "keyProvisions": [
    {
      "title": "Provision 1 Title",
      "description": "Detailed explanation of provision 1...",
      "significance": "Why this provision matters..."
    },
    {
      "title": "Provision 2 Title",
      "description": "Detailed explanation of provision 2...",
      "significance": "Why this provision matters..."
    }
  ],
  "stakeholderImpact": {
    "citizens": "How this affects individual citizens...",
    "businesses": "Impact on businesses and industry...",
    "government": "Effects on government agencies and operations..."
  },
  "politicalLandscape": {
    "support": ["Supporting group 1", "Supporting group 2"],
    "opposition": ["Opposing group 1", "Opposing group 2"],
    "keyFactors": ["Factor affecting passage 1", "Factor affecting passage 2"]
  },
  "implementationAnalysis": {
    "timeline": "Expected implementation timeline...",
    "challenges": ["Challenge 1", "Challenge 2"],
    "agencies": ["Agency 1", "Agency 2"]
  },
  "expertPerspectives": [
    {
      "perspective": "Expert perspective 1...",
      "source": "Source or type of expert"
    },
    {
      "perspective": "Expert perspective 2...",
      "source": "Source or type of expert"
    }
  ],
  "potentialOutcomes": {
    "ifPassed": "Outcomes if the bill passes...",
    "ifFailed": "Outcomes if the bill fails...",
    "alternativeScenarios": "Other possible legislative paths..."
  }
}

IMPORTANT: Ensure your response is ONLY the JSON object with no additional text before or after.
`;
      
      // Generate content
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are an expert legislative analyst with deep knowledge of U.S. legislation, policy, and political context.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
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
        const analysis = JSON.parse(cleanedText);
        console.log('✅ Successfully generated comprehensive analysis');
        
        // Store the comprehensive analysis in the database
        await this.saveComprehensiveAnalysis(bill.id, analysis);
        
        return analysis;
      } catch (parseError) {
        console.error('❌ Error parsing comprehensive analysis as JSON:', parseError);
        console.log('Raw response:', text);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('❌ Error generating comprehensive analysis:', error);
      throw new Error(`Failed to generate comprehensive analysis: ${error.message}`);
    }
  }

  /**
   * Save comprehensive analysis to database
   * @param billId Bill ID
   * @param analysis Analysis data
   */
  private async saveComprehensiveAnalysis(billId: string, analysis: any): Promise<void> {
    try {
      console.log(`💾 Saving comprehensive analysis for bill ${billId} to database...`);

      // Add generated_at timestamp
      const analysisWithTimestamp = {
        ...analysis,
        generated_at: new Date().toISOString()
      };

      // Get current session to ensure consistent user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // Store in generated_content table
      const { error } = await supabase
        .from('generated_content')
        .upsert({
          id: `comprehensive-analysis-${billId}`,
          user_id: userId, // Use session user ID for consistency with RLS
          content_type: 'analysis',
          source_type: 'bill',
          source_id: billId,
          generator: 'openai',
          generation_params: {
            billId,
            model: this.MODEL_NAME,
            type: 'comprehensive'
          },
          content_data: analysisWithTimestamp,
          title: `Comprehensive Analysis: ${billId}`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, 
        { onConflict: 'id' });

      if (error) {
        console.warn(`Could not save comprehensive analysis for bill ${billId}:`, error);
      } else {
        console.log(`✅ Successfully saved comprehensive analysis for bill ${billId}`);
      }
    } catch (error) {
      console.warn(`Error saving comprehensive analysis for bill ${billId}:`, error);
    }
  }

  /**
   * Get comprehensive analysis for a bill
   * @param billId Bill ID
   * @returns Comprehensive analysis or null if not found
   */
  async getComprehensiveAnalysis(billId: string): Promise<any | null> {
    try {
      console.log(`🔍 Getting comprehensive analysis for bill ${billId}...`);
      
      // Get current session to ensure consistent user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // Try to get user-specific content first, then anonymous content
      let query = supabase
        .from('generated_content')
        .select('content_data')
        .eq('id', `comprehensive-analysis-${billId}`);

      if (userId) {
        // For authenticated users, try their content first
        query = query.eq('user_id', userId);
      } else {
        // For anonymous users, get content without user_id
        query = query.is('user_id', null);
      }

      const { data, error } = await query.maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found, try to get any available analysis (anonymous)
          const { data: anonymousData, error: anonymousError } = await supabase
            .from('generated_content')
            .select('content_data')
            .eq('id', `comprehensive-analysis-${billId}`)
            .is('user_id', null)
            .maybeSingle();
          
          if (anonymousError && anonymousError.code === 'PGRST116') {
            return null;
          }
          
          if (anonymousError) {
            throw anonymousError;
          }
          
          return anonymousData?.content_data || null;
        }
        throw error;
      }
      
      return data?.content_data || null;
    } catch (error) {
      console.error(`❌ Error getting comprehensive analysis for bill ${billId}:`, error);
      return null;
    }
  }
}

export const openaiService = new OpenAIService();