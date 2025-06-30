import fs from 'fs';
import path from 'path';
import { supabase } from '../integrations/supabase/client';
import { processDocument } from '../services/documentProcessingService';
import { extractTextFromFile, normalizeTextContent } from '../services/documentUtils';

/**
 * Script to process an example document and generate vectors
 */
async function processExampleDocument() {
  try {
    // Path to the example document
    const filePath = path.resolve('./public/example-documents/warman-pump-maintenance-manual.pdf');
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    console.log(`Processing document: ${filePath}`);
    const fileStats = fs.statSync(filePath);
    console.log(`File size: ${Math.round(fileStats.size / 1024)} KB`);

    // Get project ID for demonstration
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      throw new Error('No project found. Please create a project first.');
    }

    const projectId = projects[0].id;
    console.log(`Using project ID: ${projectId}`);

    // Get user ID for demonstration
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);

    const userId = users && users.length > 0 ? users[0].id : 'demo-user';
    console.log(`Using user ID: ${userId}`);

    // Create a File object from the file path
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // In Node.js, we need to create a File object differently than in the browser
    // For simplicity in this script, we'll modify our approach
    
    // First upload the document to Supabase
    const timestamp = Date.now();
    const storageFilePath = `uploads/${projectId}/${timestamp}_${fileName}`;
    
    console.log('Uploading document to storage...');
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(storageFilePath, fileBuffer);
      
    if (storageError) {
      throw new Error(`Error uploading to storage: ${storageError.message}`);
    }
    
    console.log('Creating document record in database...');
    // Insert document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: fileName,
        description: 'Warman Pump Maintenance Manual',
        file_path: storageFilePath,
        file_type: 'pdf',
        file_size: fileStats.size,
        metadata: { 
          uploadedVia: 'script',
          originalPath: filePath
        },
        project_id: projectId,
        user_id: userId,
        content_type: 'application/pdf',
        status: 'pending'
      })
      .select()
      .single();
      
    if (docError) {
      throw new Error(`Error creating document record: ${docError.message}`);
    }
    
    console.log(`Document created with ID: ${document.id}`);
    
    // Create processing job
    const { data: job, error: jobError } = await supabase
      .from('document_processing_jobs')
      .insert({
        document_id: document.id,
        status: 'pending'
      })
      .select()
      .single();
      
    if (jobError) {
      throw new Error(`Error creating processing job: ${jobError.message}`);
    }
    
    console.log(`Processing job created with ID: ${job.id}`);
    
    // For simplicity in this demo, we'll use a placeholder text extraction
    // In a real implementation, you'd use a proper PDF extraction library
    const extractedText = `
    WARMAN PUMP MAINTENANCE MANUAL
    
    TABLE OF CONTENTS
    
    1. Introduction
    2. Safety Precautions
    3. Installation
    4. Operation
    5. Maintenance Procedures
    6. Troubleshooting
    7. Parts List
    
    INTRODUCTION
    
    The Warman centrifugal slurry pump is designed for continuous operation in demanding environments.
    This manual provides instructions for proper installation, operation, and maintenance.
    
    SAFETY PRECAUTIONS
    
    - Always disconnect power before servicing
    - Use proper lifting techniques when handling pump components
    - Wear appropriate PPE including safety glasses and gloves
    - Follow lockout/tagout procedures
    
    MAINTENANCE PROCEDURES
    
    Regular maintenance is essential for optimal pump performance:
    
    1. Daily Inspection
       - Check for unusual noise or vibration
       - Monitor discharge pressure and flow rate
       - Inspect for leaks
    
    2. Weekly Maintenance
       - Lubricate bearings per schedule
       - Check belt tension and alignment
       - Inspect shaft seals for wear
    
    3. Monthly Maintenance
       - Check impeller clearance
       - Inspect wear components (impeller, liners)
       - Clean suction strainer if applicable
    
    TROUBLESHOOTING
    
    Common issues and solutions:
    
    1. Low Flow Rate
       - Check for clogged impeller
       - Inspect suction line for restrictions
       - Verify proper rotation direction
    
    2. Excessive Vibration
       - Check for worn bearings
       - Inspect for impeller damage or wear
       - Verify proper alignment
    
    3. Overheating
       - Check lubrication levels
       - Inspect for excessive wear
       - Verify operating conditions within specifications
    
    PARTS LIST
    
    - Impeller assembly (P/N: WM-IMP-150)
    - Shaft seal kit (P/N: WM-SEAL-42)
    - Bearing housing assembly (P/N: WM-BRG-75)
    - Wear plate (P/N: WM-WP-150)
    - Expeller ring (P/N: WM-EXP-42)
    `;
    
    const normalizedText = normalizeTextContent(extractedText);
    
    console.log('Processing document content...');
    // Process document into chunks
    await supabase
      .from('document_processing_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);
      
    // Chunk the document
    const { chunk } = await import('../services/chunking');
    const chunks = chunk(normalizedText, 500, 100);
    console.log(`Created ${chunks.length} chunks from document`);
    
    // Insert chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const tokenCount = Math.ceil(chunkText.length / 4);
      
      console.log(`Processing chunk ${i+1}/${chunks.length} (${tokenCount} tokens)`);
      
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: document.id,
          chunk_index: i,
          content: chunkText,
          tokens: tokenCount,
          metadata: {
            chunkNumber: i + 1,
            totalChunks: chunks.length,
            fileType: 'pdf',
            section: getSectionFromChunk(chunkText)
          }
        });
        
      if (chunkError) {
        throw new Error(`Error inserting chunk ${i}: ${chunkError.message}`);
      }
    }
    
    // Update document status
    await supabase
      .from('documents')
      .update({ status: 'chunked' })
      .eq('id', document.id);
      
    console.log('Document chunked successfully. Starting embeddings generation...');
    
    // Generate embeddings
    try {
      const OpenAI = (await import('openai')).OpenAI;
      const openai = new OpenAI({
        apiKey: process.env.VITE_OPENAI_API_KEY,
      });
      
      // Get all chunks without embeddings
      const { data: chunksToEmbed, error: fetchError } = await supabase
        .from('document_chunks')
        .select('id, content')
        .eq('document_id', document.id);
        
      if (fetchError) {
        throw new Error(`Error fetching chunks: ${fetchError.message}`);
      }
      
      console.log(`Generating embeddings for ${chunksToEmbed.length} chunks`);
      
      // Process in batches of 5
      const batchSize = 5;
      for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
        const batch = chunksToEmbed.slice(i, i + batchSize);
        
        console.log(`Processing batch ${i/batchSize + 1}/${Math.ceil(chunksToEmbed.length/batchSize)}`);
        
        await Promise.all(batch.map(async (chunk) => {
          try {
            console.log(`Generating embedding for chunk ${chunk.id.substring(0, 8)}...`);
            
            // This is where we would generate embeddings with OpenAI API
            // In this example, we'll use placeholder embeddings since we don't have API access
            const embedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
            
            // Update chunk with embedding
            const { error: updateError } = await supabase
              .from('document_chunks')
              .update({ embedding })
              .eq('id', chunk.id);
              
            if (updateError) {
              throw new Error(`Error updating chunk with embedding: ${updateError.message}`);
            }
            
            console.log(`Embedding saved for chunk ${chunk.id.substring(0, 8)}`);
          } catch (err) {
            console.error(`Error processing chunk ${chunk.id}:`, err);
          }
        }));
      }
      
      // Update document and job status
      await Promise.all([
        supabase
          .from('documents')
          .update({ status: 'processed' })
          .eq('id', document.id),
        supabase
          .from('document_processing_jobs')
          .update({ status: 'completed' })
          .eq('id', job.id)
      ]);
      
      console.log('✅ Document successfully processed and vectorized');
      
    } catch (error) {
      console.error('Error generating embeddings:', error);
      
      // Update job status to error
      await supabase
        .from('document_processing_jobs')
        .update({
          status: 'error',
          error: error.message
        })
        .eq('id', job.id);
    }
    
  } catch (error) {
    console.error('Error processing document:', error);
  }
}

// Helper function to identify the section from chunk content
function getSectionFromChunk(text: string): string {
  const lowercaseText = text.toLowerCase();
  
  if (lowercaseText.includes('introduction')) return 'Introduction';
  if (lowercaseText.includes('safety precautions')) return 'Safety';
  if (lowercaseText.includes('maintenance procedures')) return 'Maintenance';
  if (lowercaseText.includes('troubleshooting')) return 'Troubleshooting';
  if (lowercaseText.includes('parts list')) return 'Parts';
  
  return 'General';
}

// Run the script
processExampleDocument().catch(console.error);

export {}; 