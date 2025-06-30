import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import type { Bill } from '../types';

class GeminiService {
  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private readonly MODEL_NAME = 'gemini-1.5-flash';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.initializeModel();
  }

  private initializeModel() {
    if (!this.apiKey) {
      console.warn('⚠️ Gemini API key not found. AI features will be disabled.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
      console.log('✅ Gemini model initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Gemini model:', error);
      this.genAI = null;
      this.model = null;
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
   * Check if the Gemini API is available
   * @returns True if the API is available, false otherwise
   */
  isAvailable(): boolean {
    return !!this.model;
  }

  /**
   * Generate bill analysis with retry logic
   * @param bill Bill to analyze
   * @param userContext User context for personalization
   * @returns AI analysis object
   */
  async generateBillAnalysis(bill: Bill, userContext?: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API is not available. Please check your API key.');
    }

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        console.log(`🧠 Generating AI analysis for bill ${bill.id} (attempt ${retries + 1})...`);
        
        // Prepare prompt with bill data
        const prompt = this.createBillAnalysisPrompt(bill, userContext);
        
        // Generate content
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
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
   * Generate bill analysis with web search grounding
   * @param bill Bill to analyze
   * @param userContext User context for personalization
   * @returns AI analysis object with web search data
   */
  async generateBillAnalysisWithWebSearch(bill: Bill, userContext?: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API is not available. Please check your API key.');
    }

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        console.log(`🧠 Generating AI analysis with web search for bill ${bill.id} (attempt ${retries + 1})...`);
        
        // Create a model with web search enabled
        const modelWithSearch = this.genAI?.getGenerativeModel({
          model: this.MODEL_NAME,
          tools: [{
            googleSearchRetrieval: {}
          }],
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        });

        if (!modelWithSearch) {
          throw new Error('Failed to initialize model with web search');
        }
        
        // Prepare search query
        const searchQuery = `${bill.bill_type} ${bill.number} ${bill.congress}th Congress ${bill.title}`;
        
        // Prepare prompt with bill data
        const prompt = this.createBillAnalysisWithWebSearchPrompt(bill, searchQuery, userContext);
        
        // Generate content with web search
        const result = await modelWithSearch.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
          },
        });
        
        const response = result.response;
        const text = response.text();
        
        // Parse the response as JSON
        try {
          const cleanedText = this.cleanJsonResponse(text);
          const analysisData = JSON.parse(cleanedText);
          console.log('✅ Successfully generated AI analysis with web search');
          
          // Add source information if available
          if (result.response.candidates && 
              result.response.candidates[0] && 
              result.response.candidates[0].groundingMetadata && 
              result.response.candidates[0].groundingMetadata.webSearchQueries) {
            analysisData.webSearchQueries = result.response.candidates[0].groundingMetadata.webSearchQueries;
          }
          
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
        console.error(`❌ Error generating AI analysis with web search (attempt ${retries}):`, error);
        
        if (retries >= this.MAX_RETRIES) {
          throw new Error(`Failed to generate AI analysis with web search after ${this.MAX_RETRIES} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
      }
    }

    throw new Error('Failed to generate AI analysis with web search');
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
You are an expert legislative analyst with deep knowledge of the U.S. Congress and legislative process.

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
   * Create a prompt for bill analysis with web search
   * @param bill Bill to analyze
   * @param searchQuery Search query for web search
   * @param userContext User context for personalization
   * @returns Prompt string
   */
  private createBillAnalysisWithWebSearchPrompt(bill: Bill, searchQuery: string, userContext?: any): string {
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
You are an expert legislative analyst with deep knowledge of the U.S. Congress and legislative process.

Use web search to find the most up-to-date and accurate information about this bill:
"${searchQuery}"

Then analyze the following bill and provide a comprehensive analysis in JSON format:

BILL DATA:
${JSON.stringify(billData, null, 2)}

${fullTextExcerpt ? `BILL FULL TEXT EXCERPT:
${fullTextExcerpt}` : ''}

${userContextData ? `USER CONTEXT:
${JSON.stringify(userContextData, null, 2)}` : ''}

Your analysis should include:
1. A plain English summary (3-5 sentences) that incorporates information from web search
2. Key provisions (3-5 bullet points) based on both the bill text and web search results
3. Impact assessment (economic, social, regional, demographic) using web search to find expert opinions
4. Passage prediction (probability as decimal 0-1, reasoning, key factors, timeline) based on current news and analysis

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
  "webSearchSummary": "Summary of what was found in web search..."
}

IMPORTANT: Ensure your response is ONLY the JSON object with no additional text before or after.
`;
  }

  /**
   * Generate a summary of bill full text using web search
   * @param bill Bill to summarize
   * @returns Summary text
   */
  async generateBillFullTextSummary(bill: Bill): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API is not available. Please check your API key.');
    }

    try {
      console.log(`🧠 Generating full text summary with web search for bill ${bill.id}...`);
      
      // Create a model with web search enabled
      const modelWithSearch = this.genAI?.getGenerativeModel({
        model: this.MODEL_NAME,
        tools: [{
          googleSearchRetrieval: {}
        }],
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      if (!modelWithSearch) {
        throw new Error('Failed to initialize model with web search');
      }
      
      // Prepare search query
      const searchQuery = `${bill.bill_type} ${bill.number} ${bill.congress}th Congress full text summary`;
      
      // Create prompt for full text summary
      const prompt = `
You are an expert legislative analyst. I need you to create a comprehensive summary of the full text of this bill:

Bill: ${bill.bill_type} ${bill.number} (${bill.congress}th Congress)
Title: ${bill.title}
${bill.short_title ? `Short Title: ${bill.short_title}` : ''}

Please search the web for the full text of this bill and create a detailed summary that covers:
1. The main purpose and objectives of the bill
2. Key provisions and sections
3. Any notable amendments or changes
4. Technical details that would be important for understanding the bill

Your summary should be thorough but accessible to an educated general audience.
Aim for 3-5 paragraphs that capture the essence of the bill's full text.

If the full text is not available through web search, please summarize based on any available information about the bill's content.
`;
      
      // Generate content with web search
      const result = await modelWithSearch.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
      
      const summary = result.response.text();
      console.log('✅ Successfully generated full text summary with web search');
      
      // Update bill in database with the summary
      await this.updateBillSummary(bill.id, summary);
      
      return summary;
    } catch (error) {
      console.error('❌ Error generating full text summary with web search:', error);
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
      
      console.log(`💾 Updating summary for bill ${billId} with web search data...`);

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
        console.log(`✅ Successfully updated summary for bill ${billId} with web search data`);
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
      throw new Error('Gemini API is not available. Please check your API key.');
    }

    try {
      console.log(`🧠 Generating chat response for question about bill ${bill.id}...`);
      
      // Prepare chat history for the model
      const history = chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
      
      // Start a chat session
      const chat = this.model.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });
      
      // Create context-aware prompt
      const prompt = this.createBillChatPrompt(question, bill);
      
      // Generate response
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      const text = response.text();
      
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
You are an expert legislative assistant who helps users understand bills in Congress.

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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
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
      throw new Error('Gemini API is not available. Please check your API key.');
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
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
      throw new Error('Gemini API is not available. Please check your API key.');
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
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
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
}

export const geminiService = new GeminiService();