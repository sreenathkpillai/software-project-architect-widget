# 🚨 Codebase Analysis Failure Debugging Guide

## Problem: Vague "FAILED" Status with No Details

The current analysis system only logs "Analysis status changed to FAILED" without providing specific error information, making debugging nearly impossible.

---

## 🔍 Possible Failure Reasons

### 1. **GitHub API Issues** (Most Likely with New GitHub Integration)
- **Rate limit exceeded**: 5000 requests/hour limit hit
- **Authentication failures**: Invalid or expired GitHub tokens
- **Repository access denied**: Private repos without proper token permissions
- **Repository not found**: URL parsing errors or deleted repos
- **Network timeouts**: Slow GitHub API responses
- **Large file handling**: Files exceeding GitHub API size limits

### 2. **AI/LLM Service Failures**
- **OpenAI API errors**: Rate limits, token issues, model unavailable
- **Token context limits**: Analysis content too large for model
- **Invalid API responses**: Malformed JSON or unexpected responses
- **Network connectivity**: Can't reach OpenAI servers

### 3. **Database Issues**
- **Connection timeouts**: Database unavailable during save
- **Constraint violations**: Invalid data being saved
- **Disk space**: Database storage full
- **Transaction conflicts**: Concurrent analysis attempts

### 4. **Memory/Resource Issues**
- **Out of memory**: Large repositories consuming too much RAM
- **CPU timeouts**: Analysis taking too long and being killed
- **File system errors**: Temporary file creation failures
- **Network bandwidth**: Slow downloads causing timeouts

### 5. **Git/Repository Issues** (Fallback Mode)
- **Clone failures**: Repository too large or network issues
- **Authentication failures**: Invalid Git credentials
- **Branch not found**: Specified branch doesn't exist
- **Corrupted repositories**: Malformed Git data

### 6. **Code Processing Errors**
- **File encoding issues**: Non-UTF8 files causing parsing errors
- **Binary files**: Attempting to analyze binary content as text
- **Infinite loops**: Recursive directory structures
- **Malformed files**: Corrupted source code files

---

## 🔧 Current Error Handling Problems

### 1. **Error Information Loss**
```typescript
// Current problematic code in analyze/route.ts
analysisService.analyzeCodebase(projectId, externalId).catch(error => {
  console.error('Background analysis failed:', error); // ❌ Only logs to server
});
```

**Problem**: Errors are only logged on server, never stored or shown to user.

### 2. **Generic Status Updates**
```typescript
// Current problematic code in analysis-service.ts
await prisma.workflowProject.update({
  where: { id: projectId },
  data: { analysisStatus: 'FAILED' } // ❌ No error details stored
});
```

**Problem**: Only sets status to "FAILED" without storing the actual error.

### 3. **Lost Error Context**
- Errors thrown in `analyzeCodebase()` are caught but details are lost
- Frontend only sees status change, not error reason
- No error timestamp or recovery suggestions

---

## 🛠️ Recommended Solutions

### 1. **Add Error Storage to Database**

Update the `WorkflowProject` schema to store error details:

```sql
-- Add error tracking columns
ALTER TABLE workflow_projects ADD COLUMN error_message TEXT;
ALTER TABLE workflow_projects ADD COLUMN error_code VARCHAR(50);
ALTER TABLE workflow_projects ADD COLUMN failed_at TIMESTAMP;
ALTER TABLE workflow_projects ADD COLUMN retry_count INTEGER DEFAULT 0;
```

### 2. **Enhanced Error Handling in Analysis Service**

```typescript
// Improved error handling in analysis-service.ts
catch (error) {
  console.error('Analysis error:', error);

  // Categorize error
  const errorInfo = this.categorizeError(error);

  // Update project status with error details
  await prisma.workflowProject.update({
    where: { id: projectId },
    data: {
      analysisStatus: 'FAILED',
      errorMessage: errorInfo.message,
      errorCode: errorInfo.code,
      failedAt: new Date(),
      retryCount: { increment: 1 }
    }
  });

  throw error;
}

private categorizeError(error: any): { code: string, message: string } {
  if (error.status === 403) {
    return {
      code: 'GITHUB_ACCESS_DENIED',
      message: 'Repository access denied. Check GitHub authentication.'
    };
  }
  if (error.status === 404) {
    return {
      code: 'REPOSITORY_NOT_FOUND',
      message: 'Repository not found or has been deleted.'
    };
  }
  if (error.message?.includes('rate limit')) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'GitHub API rate limit exceeded. Try again later.'
    };
  }
  if (error.message?.includes('OpenAI')) {
    return {
      code: 'AI_SERVICE_ERROR',
      message: 'AI analysis service unavailable. Try again later.'
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred during analysis.'
  };
}
```

### 3. **Frontend Error Display**

Update the UI to show specific error messages:

```typescript
// In ProjectDashboard.tsx
{analysisStatus === 'FAILED' && (
  <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 mt-4">
    <h4 className="text-red-400 font-medium mb-2">Analysis Failed</h4>
    <p className="text-gray-300 text-sm mb-2">{project.errorMessage}</p>
    {project.errorCode && (
      <p className="text-gray-500 text-xs">Error Code: {project.errorCode}</p>
    )}
    <button
      onClick={handleRetryAnalysis}
      className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
    >
      Retry Analysis
    </button>
  </div>
)}
```

### 4. **Detailed Server Logging**

```typescript
// Enhanced logging throughout the analysis process
console.log(`Starting analysis for project ${projectId}`);
console.log(`Repository URL: ${project.repositoryUrl}`);
console.log(`Using GitHub API: ${isGitHubRepo}`);

// Log each major step
console.log('Fetching repository metadata...');
console.log('Selecting important files...');
console.log('Generating AI analysis...');
console.log('Saving analysis to database...');
```

### 5. **Health Check Endpoint**

Create an endpoint to check analysis service health:

```typescript
// /api/workflow/analysis/health
export async function GET() {
  const healthChecks = {
    database: await checkDatabaseConnection(),
    github: await checkGitHubAPI(),
    openai: await checkOpenAIAPI(),
    diskSpace: await checkDiskSpace()
  };

  return NextResponse.json(healthChecks);
}
```

---

## 🔍 Debugging Steps for Current Failures

### 1. **Check Server Logs**
```bash
# Look for specific error patterns
grep -n "Analysis error:" /var/log/app.log
grep -n "Background analysis failed:" /var/log/app.log
grep -n "GitHub API" /var/log/app.log
```

### 2. **Check Database for Error Patterns**
```sql
-- Look for failed analyses
SELECT * FROM workflow_projects
WHERE analysis_status = 'FAILED'
ORDER BY updated_at DESC
LIMIT 10;

-- Check for timing patterns
SELECT DATE(updated_at) as date, COUNT(*) as failures
FROM workflow_projects
WHERE analysis_status = 'FAILED'
GROUP BY DATE(updated_at);
```

### 3. **Test GitHub API Connectivity**
```javascript
// Quick test script
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit();

async function testGitHubAPI() {
  try {
    const response = await octokit.rest.repos.get({
      owner: 'facebook',
      repo: 'react'
    });
    console.log('GitHub API working:', response.status);
  } catch (error) {
    console.error('GitHub API error:', error.message);
  }
}
```

### 4. **Monitor Resource Usage**
```bash
# Check memory and CPU during analysis
top -p $(pgrep -f "node.*analyze")
df -h  # Check disk space
```

---

## 🚨 Most Likely Culprits (Based on New GitHub Integration)

### 1. **GitHub API Rate Limits** (High Probability)
- **Symptom**: Works sometimes, fails other times
- **Solution**: Implement exponential backoff and user token usage
- **Quick fix**: Add rate limit detection and queueing

### 2. **Private Repository Access** (High Probability)
- **Symptom**: Public repos work, private repos fail
- **Solution**: Ensure GitHub tokens are properly passed and have correct permissions
- **Quick fix**: Better error messages for auth failures

### 3. **Large File Handling** (Medium Probability)
- **Symptom**: Small repos work, large repos fail
- **Solution**: Implement file size limits and smart filtering
- **Quick fix**: Skip files over 1MB in GitHub API calls

### 4. **AI Service Overload** (Medium Probability)
- **Symptom**: Random failures across all repo types
- **Solution**: Implement retry logic and timeout handling
- **Quick fix**: Add OpenAI error detection and retry

---

## 📋 Immediate Action Plan

1. **Add error storage** to database schema
2. **Implement error categorization** in analysis service
3. **Update frontend** to display specific error messages
4. **Add detailed logging** for each analysis step
5. **Create monitoring dashboard** for analysis success rates
6. **Implement retry mechanism** for transient failures

This will transform vague "FAILED" statuses into actionable error information that helps both developers and users understand what went wrong and how to fix it.