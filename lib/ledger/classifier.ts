import { DocType } from "./types";

type Hit = { doc: DocType; key: string };

/**
 * Classify a question to determine which document and key it relates to
 * Uses simple regex/keyword matching for deterministic classification
 */
export function classifyQuestion(q: string): Hit | null {
  const t = q.toLowerCase();

  // PRD Questions
  if (/\b(target audience|who is it for|who will use|users)\b/.test(t))
    return { doc: "prd.md", key: "audience" };
  if (/\b(must[- ]?have|mvp features|core features|essential features)\b/.test(t))
    return { doc: "prd.md", key: "mustFeatures" };
  if (/\b(should[- ]?have|nice to have features)\b/.test(t))
    return { doc: "prd.md", key: "shouldFeatures" };
  if (/\b(could[- ]?have|future features|later features)\b/.test(t))
    return { doc: "prd.md", key: "couldFeatures" };
  if (/\b(risk[s]?|mitigation[s]?|challenge[s]?)\b/.test(t))
    return { doc: "prd.md", key: "risks" };
  if (/\b(out[- ]of[- ]scope|won't do|not included|oos)\b/.test(t))
    return { doc: "prd.md", key: "outOfScope" };
  if (/\b(goal[s]?|objective[s]?|purpose)\b/.test(t))
    return { doc: "prd.md", key: "goals" };
  if (/\b(monetiz|revenue|business model|pricing)\b/.test(t))
    return { doc: "prd.md", key: "monetization" };

  // Frontend Questions
  if (/\b(ui stack|ui framework|frontend framework|react|vue|angular)\b/.test(t))
    return { doc: "frontend.md", key: "uiStack" };
  if (/\b(navigation|routing|routes)\b/.test(t))
    return { doc: "frontend.md", key: "navigation" };
  if (/\b(styling|css|sass|styled|tailwind)\b/.test(t))
    return { doc: "frontend.md", key: "styling" };
  if (/\b(component[s]?|ui component[s]?|widget[s]?)\b/.test(t))
    return { doc: "frontend.md", key: "components" };
  if (/\b(responsive|mobile|desktop|tablet|breakpoint)\b/.test(t))
    return { doc: "frontend.md", key: "responsive" };

  // Backend Questions
  if (/\b(backend architecture|server architecture|backend framework)\b/.test(t))
    return { doc: "backend.md", key: "architecture" };
  if (/\b(authentication|authorization|jwt|oauth|auth|login|signup)\b/.test(t))
    return { doc: "backend.md", key: "auth" };
  if (/\b(database choice|database selection|db choice|postgres|mongo|mysql)\b/.test(t))
    return { doc: "backend.md", key: "database" };
  if (/\b(integration[s]?|third[- ]party|external service[s]?)\b/.test(t))
    return { doc: "backend.md", key: "integrations" };

  // State Management Questions
  if (/\b(state management|global state|local state|zustand|redux|context)\b/.test(t))
    return { doc: "state-management.md", key: "rules" };
  if (/\b(persistence|local storage|session storage|cache)\b/.test(t))
    return { doc: "state-management.md", key: "persistence" };
  if (/\b(invalidation[s]?|cache invalidation|refresh|sync)\b/.test(t))
    return { doc: "state-management.md", key: "invalidations" };

  // Database Schema Questions
  if (/\b(schema|table[s]?|erd|entity|entities|model[s]?)\b/.test(t))
    return { doc: "database-schema.md", key: "schema" };
  if (/\b(index|indexes|indices|query optimization)\b/.test(t))
    return { doc: "database-schema.md", key: "indexes" };
  if (/\b(migration[s]?|database migration[s]?|schema migration)\b/.test(t))
    return { doc: "database-schema.md", key: "migrations" };
  if (/\b(relationship[s]?|foreign key|reference[s]?|association[s]?)\b/.test(t))
    return { doc: "database-schema.md", key: "relationships" };

  // API Questions
  if (/\b(endpoint[s]?|api surface|api route[s]?|rest api|graphql)\b/.test(t))
    return { doc: "api.md", key: "endpoints" };
  if (/\b(request|response|payload[s]?|body|parameter[s]?)\b/.test(t))
    return { doc: "api.md", key: "payloads" };
  if (/\b(error[s]?|error handling|status code[s]?|http code[s]?)\b/.test(t))
    return { doc: "api.md", key: "errors" };
  if (/\b(rate limit[s]?|throttl|api limit[s]?)\b/.test(t))
    return { doc: "api.md", key: "rateLimits" };
  if (/\b(api security|api key|api auth|bearer token)\b/.test(t))
    return { doc: "api.md", key: "security" };

  // DevOps Questions
  if (/\b(environment[s]?|dev|staging|production|env)\b/.test(t))
    return { doc: "devops.md", key: "environments" };
  if (/\b(pipeline[s]?|ci\/cd|deployment|deploy|build process)\b/.test(t))
    return { doc: "devops.md", key: "pipeline" };
  if (/\b(infrastructure|infra|server[s]?|hosting|cloud)\b/.test(t))
    return { doc: "devops.md", key: "infrastructure" };
  if (/\b(scaling|scale|load balancing|auto[- ]?scaling)\b/.test(t))
    return { doc: "devops.md", key: "scaling" };
  if (/\b(monitoring|logging|alert[s]?|observability)\b/.test(t))
    return { doc: "devops.md", key: "monitoring" };

  // Testing Questions
  if (/\b(test type[s]?|unit test|integration test|e2e|end[- ]to[- ]end)\b/.test(t))
    return { doc: "testingplan.md", key: "testTypes" };
  if (/\b(test tool[s]?|jest|cypress|vitest|testing library)\b/.test(t))
    return { doc: "testingplan.md", key: "tools" };
  if (/\b(coverage|test coverage|code coverage)\b/.test(t))
    return { doc: "testingplan.md", key: "coverage" };

  // Code Documentation Questions
  if (/\b(repo structure|repository structure|folder structure|project structure)\b/.test(t))
    return { doc: "codedocumentation.md", key: "structure" };
  if (/\b(code style|style guide|linting|prettier|eslint)\b/.test(t))
    return { doc: "codedocumentation.md", key: "style" };
  if (/\b(api doc[s]?|documentation|jsdoc|swagger|openapi)\b/.test(t))
    return { doc: "codedocumentation.md", key: "apiDocs" };

  // Performance Questions
  if (/\b(performance|fps|latency|response time|load time|startup)\b/.test(t))
    return { doc: "performanceoptimization.md", key: "targets" };
  if (/\b(bundle size|code splitting|lazy loading|optimization)\b/.test(t))
    return { doc: "performanceoptimization.md", key: "bundling" };
  if (/\b(caching|cache strategy|cdn|edge)\b/.test(t))
    return { doc: "performanceoptimization.md", key: "caching" };
  if (/\b(non[- ]?functional|nfr)\b/.test(t))
    return { doc: "performanceoptimization.md", key: "nfr" };

  // User Flow Questions
  if (/\b(user flow[s]?|user journey|workflow[s]?|process flow)\b/.test(t))
    return { doc: "userflow.md", key: "flows" };
  if (/\b(role[s]?|permission[s]?|user type[s]?|actor[s]?)\b/.test(t))
    return { doc: "userflow.md", key: "roles" };
  if (/\b(onboarding|signup flow|registration|first[- ]time)\b/.test(t))
    return { doc: "userflow.md", key: "onboarding" };

  // Third-party Libraries Questions
  if (/\b(library|libraries|package[s]?|dependency|dependencies|npm)\b/.test(t))
    return { doc: "thirdpartylibraries.md", key: "libraries" };
  if (/\b(license[s]?|licensing|open[- ]source|proprietary)\b/.test(t))
    return { doc: "thirdpartylibraries.md", key: "licenses" };
  if (/\b(external service[s]?|third[- ]party service[s]?|saas|api service)\b/.test(t))
    return { doc: "thirdpartylibraries.md", key: "services" };

  // README Questions
  if (/\b(project summary|overview|description|about)\b/.test(t))
    return { doc: "readme.md", key: "summary" };
  if (/\b(tech stack|technology stack|stack overview)\b/.test(t))
    return { doc: "readme.md", key: "stack" };
  if (/\b(quickstart|getting started|setup|installation)\b/.test(t))
    return { doc: "readme.md", key: "quickstart" };

  // Platform/General Questions
  if (/\b(platform[s]?|mobile app|web app|desktop|electron|react native)\b/.test(t))
    return { doc: "frontend.md", key: "platform" };

  return null;
}