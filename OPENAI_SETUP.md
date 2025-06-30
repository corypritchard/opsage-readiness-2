# OpenAI Agent Setup Guide

## Overview
The FMECA AI Agent uses OpenAI's GPT-4o model to provide intelligent FMECA data management through natural language commands.

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### 2. Environment Configuration
Add your OpenAI API key to your environment variables:

```bash
# Add to your .env.local file
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Database Migration
Run the SQL script in your Supabase Dashboard > SQL Editor to create the `fmeca_columns` table:

```sql
-- Create FMECA columns metadata table
CREATE TABLE public.fmeca_columns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.fmeca_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  column_name TEXT NOT NULL,
  column_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, column_name),
  UNIQUE(project_id, column_order)
);

-- Enable Row Level Security
ALTER TABLE public.fmeca_columns ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY fmeca_columns_select_policy ON public.fmeca_columns 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY fmeca_columns_insert_policy ON public.fmeca_columns 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY fmeca_columns_update_policy ON public.fmeca_columns 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY fmeca_columns_delete_policy ON public.fmeca_columns 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_fmeca_columns_project_id ON public.fmeca_columns(project_id);
CREATE INDEX idx_fmeca_columns_user_id ON public.fmeca_columns(user_id);
```

## Features

### Current Implementation (Phase 1)
- ✅ Agent chat interface with verbose feedback
- ✅ Mode toggle between Table View and AI Agent
- ✅ Thinking process display (like our current conversation)
- ✅ Function call visualization
- ✅ Basic agent framework ready for OpenAI integration

### Coming Soon (Phase 2)
- 🔄 Full OpenAI GPT-4o integration
- 🔄 FMECA data viewing and filtering
- 🔄 Cell editing and bulk operations
- 🔄 Row addition and removal
- 🔄 Pattern analysis and insights
- 🔄 Data validation and completeness checks

## Usage Examples

Once fully implemented, you'll be able to use commands like:

### Viewing Data
- "Show me all conveyor belt failures"
- "Display high severity entries"
- "Find entries with missing failure modes"

### Editing Data
- "Change the severity level of row 5 to high"
- "Update all pump entries to have monthly maintenance frequency"
- "Fix the spelling in the component name for row 12"

### Adding Data
- "Add a new pump impeller failure entry with high severity"
- "Create a conveyor belt entry for bearing failure"

### Analysis
- "Analyze risk patterns in elevator components"
- "Check data completeness and show missing fields"
- "What are the most common failure modes?"

## Architecture

The agent system consists of:

1. **FMECAAgent Service** (`src/services/fmecaAgent.ts`)
   - OpenAI integration
   - Function calling orchestration
   - Verbose thinking process

2. **Agent Chat Interface** (`src/components/FMECAAgentChat.tsx`)
   - Chat UI with thinking display
   - Function call visualization
   - Quick command buttons

3. **FMECA Functions** (Built into agent service)
   - `view_fmeca_data` - Query and filter data
   - `edit_fmeca_cell` - Modify individual cells
   - `add_fmeca_row` - Insert new entries
   - `remove_fmeca_row` - Delete entries
   - `bulk_edit_fmeca` - Batch operations
   - `analyze_fmeca_patterns` - Data insights

## Benefits

- **Natural Language**: Edit FMECA data using plain English
- **Intelligent**: Understands FMECA context and best practices
- **Transparent**: Shows exactly what the agent is thinking and doing
- **Efficient**: Perform complex operations with simple commands
- **Safe**: All changes are validated and can be undone

## Security Notes

- API key is used client-side with `dangerouslyAllowBrowser: true`
- Consider implementing server-side proxy for production
- All database operations use existing RLS policies
- Agent actions are logged and auditable 