import { NextRequest, NextResponse } from 'next/server';
import { WorkflowAnalysisService } from '@/lib/workflow/analysis-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { externalId } = await request.json();
    const { id: projectId } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    const analysisService = new WorkflowAnalysisService();

    // Start analysis asynchronously with detailed error logging
    analysisService.analyzeCodebase(projectId, externalId).catch(async (error) => {
      console.error('❌ Background analysis failed for project:', projectId);

      // Get detailed error information
      const errorDetails = {
        projectId,
        externalId,
        error: error.message,
        status: error.status,
        stack: error.stack,
        response: error.response?.data,
        timestamp: new Date().toISOString(),
        // Add additional context
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      };

      console.error('❌ Comprehensive error details:', JSON.stringify(errorDetails, null, 2));

      // Additional specific logging for common issues
      if (error.status === 403) {
        console.error('❌ GITHUB ACCESS DENIED - Check token permissions for private repos');
      } else if (error.status === 404) {
        console.error('❌ REPOSITORY NOT FOUND - Check URL and repository existence');
      } else if (error.status === 401) {
        console.error('❌ GITHUB AUTH FAILED - Token may be expired or invalid');
      } else if (error.status === 429 || error.message?.includes('rate limit')) {
        console.error('❌ RATE LIMIT EXCEEDED - GitHub API limit reached');
      } else if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
        console.error('❌ AI SERVICE ERROR - Check OpenAI/Claude API status');
      } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.error('❌ NETWORK ERROR - Connection timeout or reset');
      } else {
        console.error('❌ UNKNOWN ERROR - Investigate further');
      }

      // Log specific response data if available
      if (error.response?.data) {
        console.error('❌ API Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    });

    return NextResponse.json({
      message: 'Analysis started',
      projectId,
      status: 'ANALYZING'
    });

  } catch (error) {
    console.error('Analysis trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}