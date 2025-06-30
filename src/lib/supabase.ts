import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Enhanced validation with detailed logging
const validateSupabaseConfig = () => {
  console.log('🔍 Validating Supabase configuration...')
  
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url_here' || !supabaseUrl.startsWith('https://')) {
    console.error('❌ Invalid or missing VITE_SUPABASE_URL in .env file')
    console.log('📝 Please update your .env file with your actual Supabase project URL')
    console.log('   Example: VITE_SUPABASE_URL=https://your-project-id.supabase.co')
    console.log('🔗 Get your URL from: https://supabase.com/dashboard/project/your-project/settings/api')
    return false
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
    console.error('❌ Invalid or missing VITE_SUPABASE_ANON_KEY in .env file')
    console.log('📝 Please update your .env file with your actual Supabase anon key')
    console.log('   Example: VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
    console.log('🔗 Get your key from: https://supabase.com/dashboard/project/your-project/settings/api')
    return false
  }

  console.log('✅ Supabase configuration validated successfully')
  console.log('URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...')
  
  return true
}

// Validate configuration
const isConfigValid = validateSupabaseConfig()

// Create Supabase client with enhanced error handling and retry logic
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    fetch: async (url, options = {}) => {
      const maxRetries = 3
      let lastError: Error | null = null
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🌐 Making Supabase request (attempt ${attempt}/${maxRetries}) to: ${url.toString().substring(0, 50)}...`)
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
          
          // Ensure headers object exists and set required headers
          const newHeaders = new Headers(options.headers)
          newHeaders.set('Content-Type', 'application/json')
          newHeaders.set('Accept', 'application/json')
          newHeaders.set('apikey', supabaseAnonKey)
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: newHeaders
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            console.error(`❌ Supabase HTTP error (attempt ${attempt}): ${response.status} ${response.statusText}`)
            
            // Check for specific error conditions
            if (response.status === 404) {
              console.error('🔍 Project not found - check your Supabase URL')
              console.error('   Current URL:', supabaseUrl)
              console.error('   Expected format: https://your-project-id.supabase.co')
            } else if (response.status === 401) {
              console.error('🔑 Unauthorized - check your API key')
              console.error('   Current key starts with:', supabaseAnonKey.substring(0, 20) + '...')
            } else if (response.status >= 500) {
              console.error('🚨 Supabase server error - service may be down')
            } else if (response.status >= 400 && response.status < 500) {
              // For client errors (4xx), log the error but return the response
              // This allows Supabase to handle authentication errors properly
              try {
                const errorText = await response.clone().text()
                console.error('Client error response:', errorText.substring(0, 200))
              } catch (e) {
                console.error('Could not read error response')
              }
              
              // Return the response for client errors so Supabase can handle them
              console.log(`🔄 Returning response for client error (${response.status}) - letting Supabase handle it`)
              return response
            }
            
            // Log response details for debugging server errors
            try {
              const errorText = await response.clone().text()
              console.error('Error response:', errorText.substring(0, 200))
            } catch (e) {
              console.error('Could not read error response')
            }
            
            // Only retry on server errors (5xx) or network issues, not client errors (4xx)
            if (response.status < 500) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
          } else {
            console.log(`✅ Supabase request successful (attempt ${attempt})`)
            return response
          }
        } catch (error: any) {
          lastError = error
          console.error(`🚫 Supabase request failed (attempt ${attempt}/${maxRetries}):`, error.message)
          
          if (error.name === 'AbortError') {
            console.error('⏱️ Request timed out - Supabase may be slow or unreachable')
          } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.error('🌐 Network error - connection issues detected')
            console.error('   Possible causes:')
            console.error('   - Internet connection problems')
            console.error('   - Supabase service is down')
            console.error('   - Firewall blocking the request')
            console.error('   - Invalid Supabase URL:', supabaseUrl)
          }
          
          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
            console.log(`⏳ Retrying in ${delay/1000} seconds...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
      
      // All retries failed
      console.error(`❌ All ${maxRetries} attempts failed. Last error:`, lastError)
      throw lastError || new Error('All retry attempts failed')
    }
  }
})

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = isConfigValid

// Helper function to handle Supabase errors with better user feedback
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error)
  
  let userMessage = 'An error occurred while connecting to the database.'
  
  if (error?.message?.includes('Failed to fetch')) {
    userMessage = 'Unable to connect to the database. Please check your internet connection.'
    console.error('Network error - check your internet connection and Supabase URL')
  } else if (error?.message?.includes('Invalid API key')) {
    userMessage = 'Database authentication failed. Please check your configuration.'
    console.error('Authentication error - check your Supabase anon key')
  } else if (error?.code === 'PGRST116') {
    userMessage = 'Database table not found. Please check your database setup.'
    console.error('Table not found - check your database schema')
  } else if (error?.message?.includes('JWT')) {
    userMessage = 'Your session has expired. Please refresh the page and try again.'
    console.error('JWT error - session may be invalid or expired')
  } else if (error?.message?.includes('timeout')) {
    userMessage = 'The request timed out. Please try again.'
    console.error('Request timeout - Supabase may be slow')
  }
  
  return { ...error, userMessage }
}

// Test connection function with better error reporting
export const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...')
  
  if (!isSupabaseConfigured) {
    console.error('❌ Supabase not configured properly')
    return { success: false, error: 'Configuration invalid' }
  }
  
  try {
    // Test with a simple query that should work on any Supabase project
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single()
    
    if (error) {
      console.error('❌ Connection test failed:', error)
      const enhancedError = handleSupabaseError(error, 'connection test')
      return { success: false, error: enhancedError }
    }
    
    console.log('✅ Supabase connection successful')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Connection test error:', error)
    const enhancedError = handleSupabaseError(error, 'connection test')
    return { success: false, error: enhancedError }
  }
}

// Auto-test connection in development with better feedback
if (import.meta.env.DEV) {
  console.log('🔄 Scheduling Supabase connection test...')
  setTimeout(async () => {
    const result = await testSupabaseConnection()
    if (!result.success) {
      console.error('🚨 Supabase connection test failed on startup')
      console.error('   This may cause issues with the application')
      console.error('   Please check your .env configuration')
    }
  }, 2000)
}