interface FileInfo {
  path: string;
  size?: number;
  type: string;
  content?: string;
}

interface DependencyInfo {
  name: string;
  version: string;
  type: 'runtime' | 'dev' | 'peer' | 'optional';
  description?: string;
  vulnerabilities?: string[];
}

interface APIEndpoint {
  path: string;
  method: string;
  file: string;
  authentication?: string[];
  parameters?: string[];
}

interface DatabaseEntity {
  name: string;
  type: 'table' | 'model' | 'schema';
  fields: string[];
  relationships: string[];
  file: string;
}

interface CodePattern {
  pattern: string;
  confidence: number;
  files: string[];
  description: string;
}

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  description: string;
}

interface PerformanceIssue {
  type: string;
  file: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

interface ArchitecturalInsight {
  pattern: string;
  confidence: number;
  description: string;
  files: string[];
  recommendations?: string[];
}

interface CodebaseAnalysis {
  // Core project info
  projectType: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'library' | 'cli' | 'microservice';
  primaryLanguage: string;
  frameworks: Array<{ name: string; version?: string; confidence: number; role: string }>;

  // Architecture analysis
  architecture: {
    patterns: ArchitecturalInsight[];
    layering: string[];
    modularity: number; // 0-100 score
    coupling: 'loose' | 'moderate' | 'tight';
    testability: number; // 0-100 score
  };

  // Dependencies and ecosystem
  dependencies: {
    production: DependencyInfo[];
    development: DependencyInfo[];
    outdated: string[];
    vulnerable: string[];
    unused: string[];
  };

  // API and data layer
  apis: {
    endpoints: APIEndpoint[];
    authMethods: string[];
    dataFormats: string[];
  };

  database: {
    type?: string;
    entities: DatabaseEntity[];
    migrations: string[];
    seedFiles: string[];
  };

  // Code quality and issues
  codeQuality: {
    complexity: number; // 0-100
    maintainability: number; // 0-100
    testCoverage: number; // 0-100 (estimated)
    documentationCoverage: number; // 0-100
  };

  security: {
    issues: SecurityIssue[];
    authPatterns: string[];
    dataValidation: boolean;
    envVariables: string[];
  };

  performance: {
    issues: PerformanceIssue[];
    optimizations: string[];
    bundleAnalysis?: {
      entryPoints: string[];
      largeFiles: string[];
      duplicates: string[];
    };
  };

  // Development workflow
  tooling: {
    buildSystem: string[];
    linting: string[];
    formatting: string[];
    testing: string[];
    ci: string[];
    deployment: string[];
  };

  // AI-specific insights
  aiInsights: {
    entryPoints: string[]; // Where to start understanding the code
    coreLogic: string[]; // Most important business logic files
    configurationFiles: string[]; // All config files for setup
    exampleUsage: string[]; // Files showing how the system is used
    extensionPoints: string[]; // Where new features are typically added
    commonPatterns: CodePattern[]; // Repeated patterns to understand
    complexAreas: string[]; // Areas that need careful attention
    quickWins: string[]; // Easy improvement opportunities
  };
}

export class ProfessionalCodebaseAnalyzer {
  /**
   * Perform comprehensive professional-grade codebase analysis
   */
  static async analyzeCodebase(
    files: FileInfo[],
    fileContents: Array<{ path: string; content: string }>,
    packageJson?: any
  ): Promise<CodebaseAnalysis> {

    console.log('🔬 Starting professional codebase analysis...');

    // Build comprehensive analysis
    const analysis: CodebaseAnalysis = {
      projectType: this.detectProjectType(files, packageJson),
      primaryLanguage: this.detectPrimaryLanguage(files),
      frameworks: this.detectFrameworks(files, fileContents, packageJson),

      architecture: await this.analyzeArchitecture(files, fileContents),
      dependencies: this.analyzeDependencies(packageJson, files),
      apis: this.analyzeAPIs(files, fileContents),
      database: this.analyzeDatabase(files, fileContents),

      codeQuality: this.assessCodeQuality(files, fileContents),
      security: this.analyzeSecurity(files, fileContents, packageJson),
      performance: this.analyzePerformance(files, fileContents),

      tooling: this.analyzeTooling(files, packageJson),
      aiInsights: this.generateAIInsights(files, fileContents, packageJson)
    };

    console.log('✅ Professional analysis complete');
    return analysis;
  }

  /**
   * Select files optimized for AI understanding and code generation
   */
  static selectFilesForAI(files: FileInfo[], analysis?: CodebaseAnalysis): FileInfo[] {
    const selected: FileInfo[] = [];
    const maxFiles = 120; // Increased for comprehensive understanding

    // Phase 1: Critical understanding files (always include)
    selected.push(...this.selectCriticalFiles(files));

    // Phase 2: Architecture and pattern files
    selected.push(...this.selectArchitecturalFiles(files, analysis));

    // Phase 3: Business logic and core functionality
    selected.push(...this.selectBusinessLogicFiles(files));

    // Phase 4: Configuration and setup files
    selected.push(...this.selectConfigurationFiles(files));

    // Phase 5: Example and usage files
    selected.push(...this.selectExampleFiles(files));

    // Phase 6: Type definitions and interfaces
    selected.push(...this.selectTypeDefinitions(files));

    // Remove duplicates and apply filters
    const unique = Array.from(new Set(selected.map(f => f.path)))
      .map(path => files.find(f => f.path === path)!)
      .filter(f => f && !this.shouldExcludeFromAI(f.path))
      .slice(0, maxFiles);

    console.log(`📋 Selected ${unique.length} files optimized for AI analysis`);
    return unique;
  }

  // === PROJECT TYPE AND LANGUAGE DETECTION ===

  private static detectProjectType(files: FileInfo[], packageJson?: any): CodebaseAnalysis['projectType'] {
    const hasReactNative = packageJson?.dependencies?.['react-native'] ||
                          files.some(f => f.path.includes('android/') || f.path.includes('ios/'));

    const hasElectron = packageJson?.dependencies?.electron;

    const hasNext = packageJson?.dependencies?.next ||
                   files.some(f => f.path.startsWith('app/') || f.path.startsWith('pages/'));

    const hasExpress = packageJson?.dependencies?.express ||
                      files.some(f => /server\.(js|ts)$/.test(f.path));

    const hasDatabaseModels = files.some(f =>
      f.path.includes('models/') ||
      f.path.includes('entities/') ||
      f.path.includes('prisma/schema')
    );

    const hasFrontendAssets = files.some(f =>
      f.path.includes('public/') ||
      f.path.includes('static/') ||
      /\.(css|scss|sass)$/.test(f.path)
    );

    if (hasReactNative) return 'mobile';
    if (hasElectron) return 'frontend'; // Electron apps are primarily frontend
    if (hasNext || (hasFrontendAssets && hasExpress && hasDatabaseModels)) return 'fullstack';
    if (hasFrontendAssets && !hasExpress) return 'frontend';
    if (hasExpress || hasDatabaseModels) return 'backend';

    // Check for CLI patterns
    if (packageJson?.bin || files.some(f => f.path.includes('bin/') || f.path.includes('cli'))) {
      return 'cli';
    }

    // Check for library patterns
    if (packageJson?.main || packageJson?.module || files.some(f => f.path === 'index.ts' || f.path === 'src/index.ts')) {
      return 'library';
    }

    return 'backend'; // Default fallback
  }

  private static detectPrimaryLanguage(files: FileInfo[]): string {
    const extensions = files.map(f => f.path.split('.').pop()?.toLowerCase()).filter(Boolean);
    const counts: Record<string, number> = {};

    extensions.forEach(ext => {
      if (ext && ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'php', 'rb', 'cs'].includes(ext)) {
        counts[ext] = (counts[ext] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts).sort(([,a], [,b]) => b - a);
    const primary = sorted[0];

    if (!primary) return 'JavaScript';

    const [ext] = primary;
    const languageMap: Record<string, string> = {
      'ts': 'TypeScript', 'tsx': 'TypeScript',
      'js': 'JavaScript', 'jsx': 'JavaScript',
      'py': 'Python', 'java': 'Java', 'go': 'Go',
      'rs': 'Rust', 'php': 'PHP', 'rb': 'Ruby', 'cs': 'C#'
    };

    return languageMap[ext] || 'JavaScript';
  }

  // === FRAMEWORK DETECTION ===

  private static detectFrameworks(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): Array<{ name: string; version?: string; confidence: number; role: string }> {
    const frameworks: Array<{ name: string; version?: string; confidence: number; role: string }> = [];

    // Next.js detection
    const nextConfidence = this.calculateNextJSConfidence(files, fileContents, packageJson);
    if (nextConfidence > 30) {
      frameworks.push({
        name: 'Next.js',
        version: packageJson?.dependencies?.next,
        confidence: nextConfidence,
        role: 'Full-stack React framework'
      });
    }

    // React detection
    const reactConfidence = this.calculateReactConfidence(files, fileContents, packageJson);
    if (reactConfidence > 25) {
      frameworks.push({
        name: 'React',
        version: packageJson?.dependencies?.react,
        confidence: reactConfidence,
        role: 'UI library'
      });
    }

    // Prisma detection
    const prismaConfidence = this.calculatePrismaConfidence(files, fileContents, packageJson);
    if (prismaConfidence > 20) {
      frameworks.push({
        name: 'Prisma',
        version: packageJson?.dependencies?.['@prisma/client'],
        confidence: prismaConfidence,
        role: 'Database ORM'
      });
    }

    // Express.js detection
    const expressConfidence = this.calculateExpressConfidence(files, fileContents, packageJson);
    if (expressConfidence > 25) {
      frameworks.push({
        name: 'Express.js',
        version: packageJson?.dependencies?.express,
        confidence: expressConfidence,
        role: 'Backend web framework'
      });
    }

    // Tailwind CSS detection
    const tailwindConfidence = this.calculateTailwindConfidence(files, fileContents, packageJson);
    if (tailwindConfidence > 20) {
      frameworks.push({
        name: 'Tailwind CSS',
        version: packageJson?.dependencies?.tailwindcss || packageJson?.devDependencies?.tailwindcss,
        confidence: tailwindConfidence,
        role: 'Utility-first CSS framework'
      });
    }

    // TypeScript detection
    const tsConfidence = this.calculateTypeScriptConfidence(files, fileContents, packageJson);
    if (tsConfidence > 30) {
      frameworks.push({
        name: 'TypeScript',
        version: packageJson?.devDependencies?.typescript,
        confidence: tsConfidence,
        role: 'Type-safe JavaScript'
      });
    }

    return frameworks.sort((a, b) => b.confidence - a.confidence);
  }

  private static calculateNextJSConfidence(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): number {
    let confidence = 0;

    // Package.json dependency
    if (packageJson?.dependencies?.next) confidence += 40;

    // Config files
    if (files.some(f => /^next\.config\.(js|ts|mjs)$/.test(f.path))) confidence += 30;
    if (files.some(f => f.path === 'next-env.d.ts')) confidence += 25;

    // App Router (Next.js 13+)
    if (files.some(f => /^app\/.*\/(page|layout|loading|error|not-found)\.(js|ts|tsx|jsx)$/.test(f.path))) {
      confidence += 35;
    }

    // Pages Router
    if (files.some(f => /^pages\/.*\.(js|ts|tsx|jsx)$/.test(f.path))) confidence += 25;

    // API routes
    if (files.some(f => f.path.startsWith('pages/api/') || f.path.startsWith('app/api/'))) {
      confidence += 20;
    }

    // Next.js specific imports in code
    const nextImports = fileContents.filter(f =>
      f.content.includes("from 'next/") ||
      f.content.includes('import { ') && f.content.includes(' } from "next/')
    );
    confidence += Math.min(nextImports.length * 5, 25);

    return Math.min(confidence, 100);
  }

  private static calculateReactConfidence(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): number {
    let confidence = 0;

    if (packageJson?.dependencies?.react) confidence += 40;

    // JSX/TSX files
    const jsxFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
    confidence += Math.min(jsxFiles.length * 3, 30);

    // React imports
    const reactImports = fileContents.filter(f =>
      f.content.includes("from 'react'") ||
      f.content.includes('import React')
    );
    confidence += Math.min(reactImports.length * 5, 25);

    // React hooks usage
    const hookUsage = fileContents.filter(f =>
      /use(State|Effect|Context|Reducer|Callback|Memo|Ref)\s*\(/.test(f.content)
    );
    confidence += Math.min(hookUsage.length * 3, 20);

    return Math.min(confidence, 100);
  }

  private static calculatePrismaConfidence(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): number {
    let confidence = 0;

    if (packageJson?.dependencies?.['@prisma/client']) confidence += 40;
    if (packageJson?.devDependencies?.prisma) confidence += 30;

    // Schema file
    if (files.some(f => f.path.includes('schema.prisma'))) confidence += 50;

    // Migrations
    if (files.some(f => f.path.includes('prisma/migrations'))) confidence += 25;

    // Prisma imports in code
    const prismaImports = fileContents.filter(f =>
      f.content.includes("from '@prisma/client'") ||
      f.content.includes('PrismaClient')
    );
    confidence += Math.min(prismaImports.length * 8, 30);

    return Math.min(confidence, 100);
  }

  private static calculateExpressConfidence(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): number {
    let confidence = 0;

    if (packageJson?.dependencies?.express) confidence += 40;

    // Express imports and usage
    const expressUsage = fileContents.filter(f =>
      f.content.includes("require('express')") ||
      f.content.includes("from 'express'") ||
      f.content.includes('app.get(') ||
      f.content.includes('app.post(') ||
      f.content.includes('app.listen(')
    );
    confidence += Math.min(expressUsage.length * 10, 40);

    // Common Express patterns
    const expressPatterns = fileContents.filter(f =>
      f.content.includes('req.params') ||
      f.content.includes('res.json') ||
      f.content.includes('res.send') ||
      f.content.includes('middleware')
    );
    confidence += Math.min(expressPatterns.length * 5, 25);

    return Math.min(confidence, 100);
  }

  private static calculateTailwindConfidence(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): number {
    let confidence = 0;

    if (packageJson?.dependencies?.tailwindcss || packageJson?.devDependencies?.tailwindcss) confidence += 35;

    // Config file
    if (files.some(f => /^tailwind\.config\.(js|ts)$/.test(f.path))) confidence += 30;

    // Tailwind classes in code
    const tailwindUsage = fileContents.filter(f =>
      /className=["'][^"']*\b(flex|grid|p-\d|m-\d|text-|bg-|border-)\w*[^"']*["']/.test(f.content)
    );
    confidence += Math.min(tailwindUsage.length * 3, 35);

    return Math.min(confidence, 100);
  }

  private static calculateTypeScriptConfidence(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): number {
    let confidence = 0;

    if (packageJson?.devDependencies?.typescript) confidence += 30;

    // TypeScript files
    const tsFiles = files.filter(f => /\.(ts|tsx)$/.test(f.path) && !f.path.endsWith('.d.ts'));
    confidence += Math.min(tsFiles.length * 2, 40);

    // TypeScript config
    if (files.some(f => f.path === 'tsconfig.json')) confidence += 25;

    // Type annotations in code
    const typeUsage = fileContents.filter(f =>
      /:\s*(string|number|boolean|object|\w+\[\])/.test(f.content) ||
      f.content.includes('interface ') ||
      f.content.includes('type ') ||
      f.content.includes('enum ')
    );
    confidence += Math.min(typeUsage.length * 2, 30);

    return Math.min(confidence, 100);
  }

  // === ARCHITECTURE ANALYSIS ===

  private static async analyzeArchitecture(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): Promise<CodebaseAnalysis['architecture']> {
    const patterns = this.detectArchitecturalPatterns(files, fileContents);
    const layering = this.detectLayering(files);
    const modularity = this.calculateModularity(files, fileContents);
    const coupling = this.assessCoupling(files, fileContents);
    const testability = this.assessTestability(files, fileContents);

    return {
      patterns,
      layering,
      modularity,
      coupling,
      testability
    };
  }

  private static detectArchitecturalPatterns(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): ArchitecturalInsight[] {
    const patterns: ArchitecturalInsight[] = [];

    // MVC Pattern
    const mvcConfidence = this.detectMVCPattern(files, fileContents);
    if (mvcConfidence > 30) {
      patterns.push({
        pattern: 'Model-View-Controller (MVC)',
        confidence: mvcConfidence,
        description: 'Separates application logic into models, views, and controllers',
        files: this.findMVCFiles(files),
        recommendations: ['Ensure clear separation between layers', 'Keep controllers thin']
      });
    }

    // Repository Pattern
    const repoConfidence = this.detectRepositoryPattern(files, fileContents);
    if (repoConfidence > 25) {
      patterns.push({
        pattern: 'Repository Pattern',
        confidence: repoConfidence,
        description: 'Abstracts data access logic behind repository interfaces',
        files: this.findRepositoryFiles(files),
        recommendations: ['Use interfaces for repository contracts', 'Keep repositories focused on single entities']
      });
    }

    // Microservices Architecture
    const microservicesConfidence = this.detectMicroservicesPattern(files, fileContents);
    if (microservicesConfidence > 20) {
      patterns.push({
        pattern: 'Microservices Architecture',
        confidence: microservicesConfidence,
        description: 'Application structured as loosely coupled services',
        files: this.findMicroserviceFiles(files),
        recommendations: ['Ensure proper service boundaries', 'Implement proper error handling between services']
      });
    }

    // Component Architecture (Frontend)
    const componentConfidence = this.detectComponentArchitecture(files, fileContents);
    if (componentConfidence > 30) {
      patterns.push({
        pattern: 'Component-Based Architecture',
        confidence: componentConfidence,
        description: 'UI built using reusable, composable components',
        files: this.findComponentFiles(files),
        recommendations: ['Keep components small and focused', 'Use proper component composition']
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private static detectMVCPattern(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let confidence = 0;

    // Directory structure
    const hasControllers = files.some(f => f.path.includes('controllers/'));
    const hasModels = files.some(f => f.path.includes('models/'));
    const hasViews = files.some(f => f.path.includes('views/') || f.path.includes('templates/'));

    if (hasControllers) confidence += 30;
    if (hasModels) confidence += 30;
    if (hasViews) confidence += 25;

    // MVC naming patterns in files
    const mvcFiles = files.filter(f =>
      /Controller\.(js|ts)$/.test(f.path) ||
      /Model\.(js|ts)$/.test(f.path) ||
      f.path.includes('controller') ||
      f.path.includes('model')
    );
    confidence += Math.min(mvcFiles.length * 5, 25);

    return Math.min(confidence, 100);
  }

  private static detectRepositoryPattern(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let confidence = 0;

    // Repository files
    const repoFiles = files.filter(f =>
      /Repository\.(js|ts)$/.test(f.path) ||
      f.path.includes('repository') ||
      f.path.includes('repositories')
    );
    confidence += Math.min(repoFiles.length * 15, 40);

    // Repository patterns in code
    const repoPatterns = fileContents.filter(f =>
      f.content.includes('Repository') ||
      f.content.includes('findById') ||
      f.content.includes('findAll') ||
      f.content.includes('save(') ||
      f.content.includes('delete(')
    );
    confidence += Math.min(repoPatterns.length * 5, 30);

    return Math.min(confidence, 100);
  }

  private static detectMicroservicesPattern(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let confidence = 0;

    // Service directories
    const serviceDirectories = new Set<string>();
    files.forEach(f => {
      if (f.path.includes('services/') || f.path.includes('service-')) {
        serviceDirectories.add(f.path.split('/')[0]);
      }
    });
    confidence += Math.min(serviceDirectories.size * 10, 40);

    // Docker/containerization files
    const hasDocker = files.some(f => f.path.includes('Dockerfile') || f.path.includes('docker-compose'));
    if (hasDocker) confidence += 20;

    // API communication patterns
    const apiPatterns = fileContents.filter(f =>
      f.content.includes('fetch(') ||
      f.content.includes('axios.') ||
      f.content.includes('http.request') ||
      f.content.includes('serviceUrl')
    );
    confidence += Math.min(apiPatterns.length * 3, 20);

    return Math.min(confidence, 100);
  }

  private static detectComponentArchitecture(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let confidence = 0;

    // Component directories
    const hasComponents = files.some(f => f.path.includes('components/'));
    if (hasComponents) confidence += 40;

    // Component files
    const componentFiles = files.filter(f =>
      /Component\.(jsx|tsx)$/.test(f.path) ||
      /\.(jsx|tsx)$/.test(f.path) && f.path.includes('components/')
    );
    confidence += Math.min(componentFiles.length * 2, 30);

    // React/Vue component patterns
    const componentPatterns = fileContents.filter(f =>
      f.content.includes('export default function') ||
      f.content.includes('export const') && f.content.includes('= () =>') ||
      f.content.includes('export function')
    );
    confidence += Math.min(componentPatterns.length * 2, 30);

    return Math.min(confidence, 100);
  }

  private static detectLayering(files: FileInfo[]): string[] {
    const layers: string[] = [];

    // Common architectural layers
    const layerPatterns = [
      { name: 'Presentation Layer', patterns: ['components/', 'pages/', 'views/', 'ui/'] },
      { name: 'Business Logic Layer', patterns: ['services/', 'business/', 'logic/', 'use-cases/'] },
      { name: 'Data Access Layer', patterns: ['repositories/', 'data/', 'models/', 'entities/'] },
      { name: 'Infrastructure Layer', patterns: ['infrastructure/', 'adapters/', 'external/'] },
      { name: 'API Layer', patterns: ['api/', 'routes/', 'controllers/', 'endpoints/'] }
    ];

    layerPatterns.forEach(layer => {
      if (layer.patterns.some(pattern => files.some(f => f.path.includes(pattern)))) {
        layers.push(layer.name);
      }
    });

    return layers;
  }

  private static calculateModularity(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    // Simple modularity metric based on directory structure and file organization
    const directories = new Set<string>();
    files.forEach(f => {
      const parts = f.path.split('/');
      if (parts.length > 1) {
        directories.add(parts[0]);
      }
    });

    const fileCount = files.length;
    const dirCount = directories.size;

    // Higher directory to file ratio indicates better modularity
    const modularityRatio = Math.min((dirCount / fileCount) * 100, 100);

    // Bonus for common modular patterns
    let bonus = 0;
    if (files.some(f => f.path.includes('components/'))) bonus += 10;
    if (files.some(f => f.path.includes('services/'))) bonus += 10;
    if (files.some(f => f.path.includes('utils/'))) bonus += 5;
    if (files.some(f => f.path.includes('hooks/'))) bonus += 5;

    return Math.min(modularityRatio + bonus, 100);
  }

  private static assessCoupling(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): 'loose' | 'moderate' | 'tight' {
    let couplingScore = 0;

    // Analyze import statements to determine coupling
    const imports = fileContents.map(f => {
      const importMatches = f.content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
      return importMatches.length;
    });

    const avgImports = imports.reduce((a, b) => a + b, 0) / imports.length || 0;

    // Check for relative imports (indicate tight coupling)
    const relativeImports = fileContents.filter(f =>
      f.content.includes("from '../") || f.content.includes("from './")
    ).length;

    const relativeImportRatio = relativeImports / fileContents.length;

    if (avgImports > 10 || relativeImportRatio > 0.7) return 'tight';
    if (avgImports > 5 || relativeImportRatio > 0.4) return 'moderate';
    return 'loose';
  }

  private static assessTestability(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let score = 0;

    // Test files present
    const testFiles = files.filter(f =>
      /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f.path) ||
      f.path.includes('__tests__') ||
      f.path.includes('test/')
    );

    const testCoverage = (testFiles.length / files.length) * 100;
    score += Math.min(testCoverage * 2, 40);

    // Testing framework usage
    const hasJest = files.some(f => f.path.includes('jest.config')) ||
                   fileContents.some(f => f.content.includes("from 'jest'"));
    const hasCypress = files.some(f => f.path.includes('cypress/'));
    const hasPlaywright = fileContents.some(f => f.content.includes('@playwright/test'));

    if (hasJest) score += 20;
    if (hasCypress) score += 15;
    if (hasPlaywright) score += 15;

    // Pure functions (easier to test)
    const pureFunctions = fileContents.filter(f =>
      f.content.includes('export function') ||
      f.content.includes('export const') && f.content.includes('= (')
    );
    score += Math.min(pureFunctions.length, 25);

    return Math.min(score, 100);
  }

  // === DEPENDENCY ANALYSIS ===

  private static analyzeDependencies(packageJson?: any, files?: FileInfo[]): CodebaseAnalysis['dependencies'] {
    if (!packageJson) {
      return {
        production: [],
        development: [],
        outdated: [],
        vulnerable: [],
        unused: []
      };
    }

    const production = this.parseDependencies(packageJson.dependencies || {}, 'runtime');
    const development = this.parseDependencies(packageJson.devDependencies || {}, 'dev');

    // Simple vulnerability detection (would need external API in real implementation)
    const vulnerable = this.detectVulnerableDependencies([...production, ...development]);

    // Outdated detection (simplified)
    const outdated = this.detectOutdatedDependencies([...production, ...development]);

    return {
      production,
      development,
      outdated,
      vulnerable,
      unused: [] // Would require usage analysis
    };
  }

  private static parseDependencies(deps: Record<string, string>, type: 'runtime' | 'dev'): DependencyInfo[] {
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version,
      type,
      description: this.getDependencyDescription(name)
    }));
  }

  private static getDependencyDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'react': 'JavaScript library for building user interfaces',
      'next': 'React framework for production',
      'express': 'Fast, unopinionated, minimalist web framework for Node.js',
      'prisma': 'Next-generation ORM for Node.js and TypeScript',
      'tailwindcss': 'Utility-first CSS framework',
      'typescript': 'TypeScript is JavaScript with syntax for types',
      'eslint': 'Find and fix problems in JavaScript code',
      'jest': 'JavaScript testing framework',
      'cypress': 'End-to-end testing framework'
    };

    return descriptions[name] || 'No description available';
  }

  private static detectVulnerableDependencies(deps: DependencyInfo[]): string[] {
    // In a real implementation, this would check against vulnerability databases
    const knownVulnerable = ['lodash@4.17.15', 'moment@2.29.1', 'axios@0.21.1'];

    return deps
      .filter(dep => knownVulnerable.some(vuln => vuln.startsWith(dep.name + '@')))
      .map(dep => dep.name);
  }

  private static detectOutdatedDependencies(deps: DependencyInfo[]): string[] {
    // Simplified outdated detection - in real implementation would check npm registry
    return deps
      .filter(dep => dep.version.startsWith('^') && !dep.version.includes('latest'))
      .map(dep => dep.name)
      .slice(0, 5); // Limit to first 5 for demo
  }

  // === API ANALYSIS ===

  private static analyzeAPIs(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): CodebaseAnalysis['apis'] {
    const endpoints = this.extractAPIEndpoints(files, fileContents);
    const authMethods = this.detectAuthMethods(fileContents);
    const dataFormats = this.detectDataFormats(fileContents);

    return {
      endpoints,
      authMethods,
      dataFormats
    };
  }

  private static extractAPIEndpoints(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    // Next.js API routes
    const nextApiFiles = files.filter(f => f.path.startsWith('pages/api/') || f.path.startsWith('app/api/'));
    nextApiFiles.forEach(file => {
      const path = file.path
        .replace(/^(pages\/api\/|app\/api\/)/, '')
        .replace(/\.(js|ts)$/, '')
        .replace(/\/route$/, ''); // App router routes

      endpoints.push({
        path: `/api/${path}`,
        method: 'GET/POST', // Next.js routes can handle multiple methods
        file: file.path
      });
    });

    // Express.js routes
    fileContents.forEach(f => {
      const routeMatches = f.content.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (routeMatches) {
        routeMatches.forEach(match => {
          const methodMatch = match.match(/app\.(\w+)/);
          const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);

          if (methodMatch && pathMatch) {
            endpoints.push({
              path: pathMatch[1],
              method: methodMatch[1].toUpperCase(),
              file: f.path
            });
          }
        });
      }
    });

    return endpoints;
  }

  private static detectAuthMethods(fileContents: Array<{ path: string; content: string }>): string[] {
    const authMethods: string[] = [];

    // JWT
    if (fileContents.some(f => f.content.includes('jsonwebtoken') || f.content.includes('jwt'))) {
      authMethods.push('JWT (JSON Web Tokens)');
    }

    // OAuth
    if (fileContents.some(f => f.content.includes('oauth') || f.content.includes('passport'))) {
      authMethods.push('OAuth');
    }

    // Session-based
    if (fileContents.some(f => f.content.includes('express-session') || f.content.includes('req.session'))) {
      authMethods.push('Session-based authentication');
    }

    // API Keys
    if (fileContents.some(f => f.content.includes('api-key') || f.content.includes('apiKey'))) {
      authMethods.push('API Key authentication');
    }

    return authMethods;
  }

  private static detectDataFormats(fileContents: Array<{ path: string; content: string }>): string[] {
    const formats: string[] = [];

    if (fileContents.some(f => f.content.includes('JSON.parse') || f.content.includes('res.json'))) {
      formats.push('JSON');
    }

    if (fileContents.some(f => f.content.includes('xml') || f.content.includes('XML'))) {
      formats.push('XML');
    }

    if (fileContents.some(f => f.content.includes('multipart/form-data'))) {
      formats.push('Multipart Form Data');
    }

    return formats;
  }

  // === DATABASE ANALYSIS ===

  private static analyzeDatabase(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): CodebaseAnalysis['database'] {
    const type = this.detectDatabaseType(files, fileContents);
    const entities = this.extractDatabaseEntities(files, fileContents);
    const migrations = this.findMigrationFiles(files);
    const seedFiles = this.findSeedFiles(files);

    return {
      type,
      entities,
      migrations,
      seedFiles
    };
  }

  private static detectDatabaseType(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string | undefined {
    // Prisma
    if (files.some(f => f.path.includes('prisma/schema.prisma'))) {
      const schemaFile = fileContents.find(f => f.path.includes('schema.prisma'));
      if (schemaFile) {
        if (schemaFile.content.includes('provider = "postgresql"')) return 'PostgreSQL (Prisma)';
        if (schemaFile.content.includes('provider = "mysql"')) return 'MySQL (Prisma)';
        if (schemaFile.content.includes('provider = "sqlite"')) return 'SQLite (Prisma)';
        return 'Prisma ORM';
      }
    }

    // MongoDB
    if (fileContents.some(f => f.content.includes('mongoose') || f.content.includes('mongodb'))) {
      return 'MongoDB';
    }

    // SQL databases
    if (fileContents.some(f => f.content.includes('pg') || f.content.includes('postgresql'))) {
      return 'PostgreSQL';
    }

    if (fileContents.some(f => f.content.includes('mysql'))) {
      return 'MySQL';
    }

    return undefined;
  }

  private static extractDatabaseEntities(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): DatabaseEntity[] {
    const entities: DatabaseEntity[] = [];

    // Prisma models
    const prismaSchema = fileContents.find(f => f.path.includes('schema.prisma'));
    if (prismaSchema) {
      const modelMatches = prismaSchema.content.match(/model\s+(\w+)\s*\{[^}]+\}/g);
      if (modelMatches) {
        modelMatches.forEach(match => {
          const nameMatch = match.match(/model\s+(\w+)/);
          if (nameMatch) {
            const fields = match.match(/(\w+)\s+\w+/g) || [];
            entities.push({
              name: nameMatch[1],
              type: 'model',
              fields: fields.slice(1), // Skip the model name
              relationships: [], // Would need more complex parsing
              file: prismaSchema.path
            });
          }
        });
      }
    }

    // Sequelize models
    const modelFiles = files.filter(f => f.path.includes('models/') && /\.(js|ts)$/.test(f.path));
    modelFiles.forEach(file => {
      const content = fileContents.find(f => f.path === file.path);
      if (content && content.content.includes('sequelize.define')) {
        const nameMatch = content.content.match(/sequelize\.define\s*\(\s*['"`](\w+)['"`]/);
        if (nameMatch) {
          entities.push({
            name: nameMatch[1],
            type: 'table',
            fields: [], // Would need more parsing
            relationships: [],
            file: file.path
          });
        }
      }
    });

    return entities;
  }

  private static findMigrationFiles(files: FileInfo[]): string[] {
    return files
      .filter(f => f.path.includes('migration') || f.path.includes('migrate'))
      .map(f => f.path);
  }

  private static findSeedFiles(files: FileInfo[]): string[] {
    return files
      .filter(f => f.path.includes('seed') || f.path.includes('fixture'))
      .map(f => f.path);
  }

  // === CODE QUALITY ASSESSMENT ===

  private static assessCodeQuality(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): CodebaseAnalysis['codeQuality'] {
    const complexity = this.calculateComplexity(fileContents);
    const maintainability = this.assessMaintainability(files, fileContents);
    const testCoverage = this.estimateTestCoverage(files);
    const documentationCoverage = this.assessDocumentationCoverage(files, fileContents);

    return {
      complexity,
      maintainability,
      testCoverage,
      documentationCoverage
    };
  }

  private static calculateComplexity(fileContents: Array<{ path: string; content: string }>): number {
    let totalComplexity = 0;
    let fileCount = 0;

    fileContents.forEach(f => {
      if (/\.(js|ts|jsx|tsx)$/.test(f.path)) {
        // Simple cyclomatic complexity approximation
        const ifStatements = (f.content.match(/\bif\s*\(/g) || []).length;
        const forLoops = (f.content.match(/\bfor\s*\(/g) || []).length;
        const whileLoops = (f.content.match(/\bwhile\s*\(/g) || []).length;
        const switches = (f.content.match(/\bswitch\s*\(/g) || []).length;
        const ternary = (f.content.match(/\?.*:/g) || []).length;

        const fileComplexity = 1 + ifStatements + forLoops + whileLoops + switches + ternary;
        totalComplexity += fileComplexity;
        fileCount++;
      }
    });

    const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;

    // Convert to 0-100 scale (inverse - lower complexity is better)
    return Math.max(0, 100 - Math.min(avgComplexity * 5, 100));
  }

  private static assessMaintainability(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let score = 50; // Start with neutral score

    // File size analysis
    const largeFiles = files.filter(f => f.size && f.size > 50000); // > 50KB
    score -= Math.min(largeFiles.length * 5, 25);

    // Function size analysis
    const longFunctions = fileContents.filter(f => {
      const functionMatches = f.content.match(/function\s+\w+[^{]*{[^}]*}/g) || [];
      return functionMatches.some(fn => fn.length > 1000); // Long functions
    });
    score -= Math.min(longFunctions.length * 3, 20);

    // Good practices
    const hasLinting = files.some(f => f.path.includes('eslint') || f.path.includes('.eslintrc'));
    const hasFormatting = files.some(f => f.path.includes('prettier') || f.path.includes('.prettierrc'));
    const hasTypeScript = files.some(f => /\.(ts|tsx)$/.test(f.path));

    if (hasLinting) score += 15;
    if (hasFormatting) score += 10;
    if (hasTypeScript) score += 20;

    return Math.max(0, Math.min(score, 100));
  }

  private static estimateTestCoverage(files: FileInfo[]): number {
    const sourceFiles = files.filter(f =>
      /\.(js|ts|jsx|tsx)$/.test(f.path) &&
      !f.path.includes('test') &&
      !f.path.includes('spec') &&
      !f.path.includes('node_modules')
    );

    const testFiles = files.filter(f =>
      /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f.path) ||
      f.path.includes('__tests__')
    );

    if (sourceFiles.length === 0) return 0;

    // Rough estimation: assume each test file covers 2-3 source files
    const estimatedCoverage = Math.min((testFiles.length * 2.5) / sourceFiles.length * 100, 100);

    return Math.round(estimatedCoverage);
  }

  private static assessDocumentationCoverage(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): number {
    let score = 0;

    // README files
    const hasReadme = files.some(f => /readme\.(md|txt)/i.test(f.path));
    if (hasReadme) score += 30;

    // API documentation
    const hasApiDocs = files.some(f =>
      f.path.includes('docs/') ||
      f.path.includes('swagger') ||
      f.path.includes('openapi')
    );
    if (hasApiDocs) score += 25;

    // Code comments
    const codeFiles = fileContents.filter(f => /\.(js|ts|jsx|tsx)$/.test(f.path));
    const filesWithComments = codeFiles.filter(f =>
      f.content.includes('/**') ||
      f.content.includes('//') ||
      f.content.includes('/*')
    );

    const commentCoverage = codeFiles.length > 0 ? (filesWithComments.length / codeFiles.length) * 45 : 0;
    score += commentCoverage;

    return Math.min(score, 100);
  }

  // === SECURITY ANALYSIS ===

  private static analyzeSecurity(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): CodebaseAnalysis['security'] {
    const issues = this.detectSecurityIssues(fileContents);
    const authPatterns = this.detectAuthPatterns(fileContents);
    const dataValidation = this.checkDataValidation(fileContents);
    const envVariables = this.findEnvVariables(files, fileContents);

    return {
      issues,
      authPatterns,
      dataValidation,
      envVariables
    };
  }

  private static detectSecurityIssues(fileContents: Array<{ path: string; content: string }>): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    fileContents.forEach(f => {
      // Hardcoded secrets
      if (f.content.match(/(password|secret|key)\s*[:=]\s*['"][^'"]+['"]/i)) {
        issues.push({
          type: 'Hardcoded Secrets',
          severity: 'high',
          file: f.path,
          description: 'Potential hardcoded secrets found in source code'
        });
      }

      // SQL injection potential
      if (f.content.includes('query(') && f.content.includes('${')) {
        issues.push({
          type: 'SQL Injection Risk',
          severity: 'high',
          file: f.path,
          description: 'Potential SQL injection vulnerability from string interpolation'
        });
      }

      // Eval usage
      if (f.content.includes('eval(')) {
        issues.push({
          type: 'Code Injection',
          severity: 'critical',
          file: f.path,
          description: 'Use of eval() function poses security risk'
        });
      }

      // Insecure random
      if (f.content.includes('Math.random()')) {
        issues.push({
          type: 'Weak Random Generation',
          severity: 'medium',
          file: f.path,
          description: 'Math.random() is not cryptographically secure'
        });
      }
    });

    return issues;
  }

  private static detectAuthPatterns(fileContents: Array<{ path: string; content: string }>): string[] {
    const patterns: string[] = [];

    if (fileContents.some(f => f.content.includes('jwt') || f.content.includes('jsonwebtoken'))) {
      patterns.push('JWT Authentication');
    }

    if (fileContents.some(f => f.content.includes('passport'))) {
      patterns.push('Passport.js Authentication');
    }

    if (fileContents.some(f => f.content.includes('bcrypt') || f.content.includes('scrypt'))) {
      patterns.push('Password Hashing');
    }

    if (fileContents.some(f => f.content.includes('oauth') || f.content.includes('OAuth'))) {
      patterns.push('OAuth Authentication');
    }

    return patterns;
  }

  private static checkDataValidation(fileContents: Array<{ path: string; content: string }>): boolean {
    return fileContents.some(f =>
      f.content.includes('joi') ||
      f.content.includes('yup') ||
      f.content.includes('zod') ||
      f.content.includes('validator') ||
      f.content.includes('validate(')
    );
  }

  private static findEnvVariables(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const envVars = new Set<string>();

    // From .env files
    const envFiles = files.filter(f => f.path.includes('.env'));
    envFiles.forEach(file => {
      const content = fileContents.find(f => f.path === file.path);
      if (content) {
        const matches = content.content.match(/^[A-Z_][A-Z0-9_]*=/gm);
        if (matches) {
          matches.forEach(match => envVars.add(match.replace('=', '')));
        }
      }
    });

    // From process.env usage
    fileContents.forEach(f => {
      const matches = f.content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.replace('process.env.', '');
          envVars.add(varName);
        });
      }
    });

    return Array.from(envVars);
  }

  // === PERFORMANCE ANALYSIS ===

  private static analyzePerformance(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): CodebaseAnalysis['performance'] {
    const issues = this.detectPerformanceIssues(fileContents);
    const optimizations = this.suggestOptimizations(files, fileContents);
    const bundleAnalysis = this.analyzeBundleStructure(files);

    return {
      issues,
      optimizations,
      bundleAnalysis
    };
  }

  private static detectPerformanceIssues(fileContents: Array<{ path: string; content: string }>): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    fileContents.forEach(f => {
      // Synchronous operations in async context
      if (f.content.includes('fs.readFileSync') || f.content.includes('fs.writeFileSync')) {
        issues.push({
          type: 'Blocking I/O',
          file: f.path,
          description: 'Synchronous file operations can block the event loop',
          impact: 'high'
        });
      }

      // Large loops without optimization
      if (f.content.match(/for\s*\([^)]*\)\s*\{[^}]{500,}\}/)) {
        issues.push({
          type: 'Large Loop',
          file: f.path,
          description: 'Large loop body may impact performance',
          impact: 'medium'
        });
      }

      // Memory leaks potential
      if (f.content.includes('setInterval') && !f.content.includes('clearInterval')) {
        issues.push({
          type: 'Memory Leak Risk',
          file: f.path,
          description: 'setInterval without clearInterval may cause memory leaks',
          impact: 'medium'
        });
      }
    });

    return issues;
  }

  private static suggestOptimizations(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const optimizations: string[] = [];

    // Check for image optimization
    const hasImages = files.some(f => /\.(png|jpg|jpeg|gif)$/i.test(f.path));
    const hasImageOptimization = files.some(f => f.path.includes('next.config') &&
      fileContents.find(c => c.path === f.path)?.content.includes('images'));

    if (hasImages && !hasImageOptimization) {
      optimizations.push('Consider implementing image optimization');
    }

    // Check for code splitting
    const hasCodeSplitting = fileContents.some(f =>
      f.content.includes('dynamic(') || f.content.includes('lazy(')
    );

    if (!hasCodeSplitting) {
      optimizations.push('Implement code splitting for better bundle management');
    }

    // Check for caching
    const hasCaching = fileContents.some(f =>
      f.content.includes('cache') || f.content.includes('redis') || f.content.includes('memcached')
    );

    if (!hasCaching) {
      optimizations.push('Consider implementing caching strategies');
    }

    return optimizations;
  }

  private static analyzeBundleStructure(files: FileInfo[]): CodebaseAnalysis['performance']['bundleAnalysis'] {
    const entryPoints = files
      .filter(f => /^(index|main|app)\.(js|ts|tsx|jsx)$/.test(f.path.split('/').pop() || ''))
      .map(f => f.path);

    const largeFiles = files
      .filter(f => f.size && f.size > 100000) // > 100KB
      .map(f => f.path);

    // Simple duplicate detection based on file names
    const fileNames = files.map(f => f.path.split('/').pop() || '');
    const duplicates = fileNames.filter((name, index) =>
      fileNames.indexOf(name) !== index && name !== ''
    );

    return {
      entryPoints,
      largeFiles,
      duplicates: Array.from(new Set(duplicates))
    };
  }

  // === TOOLING ANALYSIS ===

  private static analyzeTooling(files: FileInfo[], packageJson?: any): CodebaseAnalysis['tooling'] {
    return {
      buildSystem: this.detectBuildSystem(files, packageJson),
      linting: this.detectLinting(files, packageJson),
      formatting: this.detectFormatting(files, packageJson),
      testing: this.detectTesting(files, packageJson),
      ci: this.detectCI(files),
      deployment: this.detectDeployment(files)
    };
  }

  private static detectBuildSystem(files: FileInfo[], packageJson?: any): string[] {
    const systems: string[] = [];

    if (packageJson?.scripts?.build) systems.push('npm scripts');
    if (files.some(f => f.path.includes('webpack.config'))) systems.push('Webpack');
    if (files.some(f => f.path.includes('vite.config'))) systems.push('Vite');
    if (files.some(f => f.path.includes('rollup.config'))) systems.push('Rollup');
    if (files.some(f => f.path.includes('next.config'))) systems.push('Next.js');
    if (files.some(f => f.path.includes('Dockerfile'))) systems.push('Docker');

    return systems;
  }

  private static detectLinting(files: FileInfo[], packageJson?: any): string[] {
    const linters: string[] = [];

    if (files.some(f => f.path.includes('eslint')) || packageJson?.devDependencies?.eslint) {
      linters.push('ESLint');
    }
    if (files.some(f => f.path.includes('tslint')) || packageJson?.devDependencies?.tslint) {
      linters.push('TSLint');
    }

    return linters;
  }

  private static detectFormatting(files: FileInfo[], packageJson?: any): string[] {
    const formatters: string[] = [];

    if (files.some(f => f.path.includes('prettier')) || packageJson?.devDependencies?.prettier) {
      formatters.push('Prettier');
    }

    return formatters;
  }

  private static detectTesting(files: FileInfo[], packageJson?: any): string[] {
    const frameworks: string[] = [];

    if (packageJson?.devDependencies?.jest || files.some(f => f.path.includes('jest'))) {
      frameworks.push('Jest');
    }
    if (packageJson?.devDependencies?.cypress || files.some(f => f.path.includes('cypress'))) {
      frameworks.push('Cypress');
    }
    if (packageJson?.devDependencies?.['@playwright/test']) {
      frameworks.push('Playwright');
    }
    if (packageJson?.devDependencies?.vitest) {
      frameworks.push('Vitest');
    }

    return frameworks;
  }

  private static detectCI(files: FileInfo[]): string[] {
    const ci: string[] = [];

    if (files.some(f => f.path.includes('.github/workflows'))) ci.push('GitHub Actions');
    if (files.some(f => f.path.includes('.gitlab-ci'))) ci.push('GitLab CI');
    if (files.some(f => f.path.includes('Jenkinsfile'))) ci.push('Jenkins');
    if (files.some(f => f.path.includes('.circleci'))) ci.push('CircleCI');

    return ci;
  }

  private static detectDeployment(files: FileInfo[]): string[] {
    const deployment: string[] = [];

    if (files.some(f => f.path.includes('vercel.json'))) deployment.push('Vercel');
    if (files.some(f => f.path.includes('netlify.toml'))) deployment.push('Netlify');
    if (files.some(f => f.path.includes('Dockerfile'))) deployment.push('Docker');
    if (files.some(f => f.path.includes('docker-compose'))) deployment.push('Docker Compose');
    if (files.some(f => f.path.includes('kubernetes') || f.path.includes('k8s'))) {
      deployment.push('Kubernetes');
    }

    return deployment;
  }

  // === AI-SPECIFIC INSIGHTS ===

  private static generateAIInsights(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): CodebaseAnalysis['aiInsights'] {
    return {
      entryPoints: this.findAIEntryPoints(files, fileContents),
      coreLogic: this.findCoreLogic(files, fileContents),
      configurationFiles: this.findConfigurationFiles(files),
      exampleUsage: this.findExampleUsage(files, fileContents),
      extensionPoints: this.findExtensionPoints(files, fileContents),
      commonPatterns: this.findCommonPatterns(fileContents),
      complexAreas: this.findComplexAreas(files, fileContents),
      quickWins: this.findQuickWins(files, fileContents, packageJson)
    };
  }

  private static findAIEntryPoints(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const entryPoints: string[] = [];

    // Main application entry points
    ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'server.js', 'server.ts']
      .forEach(name => {
        const file = files.find(f => f.path === name || f.path.endsWith(`/${name}`));
        if (file) entryPoints.push(file.path);
      });

    // Next.js specific entry points
    ['app/layout.tsx', 'app/page.tsx', 'pages/_app.tsx', 'pages/index.tsx']
      .forEach(path => {
        if (files.some(f => f.path === path)) entryPoints.push(path);
      });

    // Package.json main field
    const mainFile = files.find(f => f.path === 'package.json');
    if (mainFile) {
      const content = fileContents.find(f => f.path === mainFile.path);
      if (content) {
        try {
          const pkg = JSON.parse(content.content);
          if (pkg.main && files.some(f => f.path === pkg.main)) {
            entryPoints.push(pkg.main);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    return Array.from(new Set(entryPoints));
  }

  private static findCoreLogic(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const coreFiles: string[] = [];

    // Files with high import/export activity (central to the codebase)
    const importCounts = fileContents.map(f => ({
      path: f.path,
      imports: (f.content.match(/import.*from/g) || []).length,
      exports: (f.content.match(/export/g) || []).length
    }));

    const highActivity = importCounts
      .filter(f => f.imports + f.exports > 5)
      .sort((a, b) => (b.imports + b.exports) - (a.imports + a.exports))
      .slice(0, 10)
      .map(f => f.path);

    coreFiles.push(...highActivity);

    // Service and business logic files
    const businessLogic = files.filter(f =>
      f.path.includes('services/') ||
      f.path.includes('business/') ||
      f.path.includes('logic/') ||
      f.path.includes('core/') ||
      f.path.includes('domain/')
    ).map(f => f.path);

    coreFiles.push(...businessLogic);

    return Array.from(new Set(coreFiles)).slice(0, 15);
  }

  private static findConfigurationFiles(files: FileInfo[]): string[] {
    const configPatterns = [
      /\.config\.(js|ts|json)$/,
      /^(tsconfig|jsconfig)\.json$/,
      /^\.env/,
      /^(package|composer|requirements|Cargo|go)\.*/,
      /^(Dockerfile|docker-compose)/,
      /^\.git/,
      /^(babel|webpack|rollup|vite)\.config/
    ];

    return files
      .filter(f => configPatterns.some(pattern => pattern.test(f.path)))
      .map(f => f.path);
  }

  private static findExampleUsage(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const examples: string[] = [];

    // README files often contain usage examples
    const readmeFile = files.find(f => /readme/i.test(f.path));
    if (readmeFile) examples.push(readmeFile.path);

    // Example directories
    const exampleFiles = files.filter(f =>
      f.path.includes('example') ||
      f.path.includes('demo') ||
      f.path.includes('sample')
    ).map(f => f.path);

    examples.push(...exampleFiles);

    // Test files often show usage patterns
    const testFiles = files.filter(f =>
      /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f.path)
    ).slice(0, 5).map(f => f.path); // Limit to first 5 test files

    examples.push(...testFiles);

    return examples;
  }

  private static findExtensionPoints(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const extensionPoints: string[] = [];

    // Plugin or extension directories
    const pluginFiles = files.filter(f =>
      f.path.includes('plugin') ||
      f.path.includes('extension') ||
      f.path.includes('middleware') ||
      f.path.includes('hook')
    ).map(f => f.path);

    extensionPoints.push(...pluginFiles);

    // Files with many exported functions (likely extension points)
    const exportHeavyFiles = fileContents
      .filter(f => (f.content.match(/export/g) || []).length > 3)
      .slice(0, 8)
      .map(f => f.path);

    extensionPoints.push(...exportHeavyFiles);

    return Array.from(new Set(extensionPoints));
  }

  private static findCommonPatterns(fileContents: Array<{ path: string; content: string }>): CodePattern[] {
    const patterns: CodePattern[] = [];

    // React component pattern
    const reactComponents = fileContents.filter(f =>
      f.content.includes('export default function') ||
      (f.content.includes('export const') && f.content.includes('= () =>'))
    );

    if (reactComponents.length > 3) {
      patterns.push({
        pattern: 'React Functional Components',
        confidence: Math.min(reactComponents.length * 10, 100),
        files: reactComponents.slice(0, 5).map(f => f.path),
        description: 'Functional components are the primary pattern for UI components'
      });
    }

    // API route pattern
    const apiRoutes = fileContents.filter(f =>
      f.content.includes('app.get') ||
      f.content.includes('app.post') ||
      f.content.includes('export async function GET') ||
      f.content.includes('export async function POST')
    );

    if (apiRoutes.length > 2) {
      patterns.push({
        pattern: 'RESTful API Routes',
        confidence: Math.min(apiRoutes.length * 15, 100),
        files: apiRoutes.slice(0, 5).map(f => f.path),
        description: 'REST API endpoints following standard HTTP methods'
      });
    }

    // Async/await pattern
    const asyncFiles = fileContents.filter(f =>
      f.content.includes('async') && f.content.includes('await')
    );

    if (asyncFiles.length > 5) {
      patterns.push({
        pattern: 'Async/Await for Asynchronous Operations',
        confidence: Math.min(asyncFiles.length * 5, 100),
        files: asyncFiles.slice(0, 5).map(f => f.path),
        description: 'Modern JavaScript async/await pattern for handling asynchronous operations'
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private static findComplexAreas(files: FileInfo[], fileContents: Array<{ path: string; content: string }>): string[] {
    const complexFiles: string[] = [];

    // Large files
    const largeFiles = files
      .filter(f => f.size && f.size > 50000) // > 50KB
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 5)
      .map(f => f.path);

    complexFiles.push(...largeFiles);

    // Files with high cyclomatic complexity
    const complexLogic = fileContents
      .map(f => ({
        path: f.path,
        complexity: this.calculateFileComplexity(f.content)
      }))
      .filter(f => f.complexity > 10)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 5)
      .map(f => f.path);

    complexFiles.push(...complexLogic);

    return Array.from(new Set(complexFiles));
  }

  private static calculateFileComplexity(content: string): number {
    const ifStatements = (content.match(/\bif\s*\(/g) || []).length;
    const forLoops = (content.match(/\bfor\s*\(/g) || []).length;
    const whileLoops = (content.match(/\bwhile\s*\(/g) || []).length;
    const switches = (content.match(/\bswitch\s*\(/g) || []).length;
    const ternary = (content.match(/\?.*:/g) || []).length;

    return 1 + ifStatements + forLoops + whileLoops + switches + ternary;
  }

  private static findQuickWins(files: FileInfo[], fileContents: Array<{ path: string; content: string }>, packageJson?: any): string[] {
    const quickWins: string[] = [];

    // Missing TypeScript
    const hasJS = files.some(f => /\.js$/.test(f.path));
    const hasTS = files.some(f => /\.ts$/.test(f.path));
    if (hasJS && !hasTS) {
      quickWins.push('Convert JavaScript files to TypeScript for better type safety');
    }

    // Missing linting
    const hasLinting = files.some(f => f.path.includes('eslint')) || packageJson?.devDependencies?.eslint;
    if (!hasLinting) {
      quickWins.push('Add ESLint for code quality and consistency');
    }

    // Missing formatting
    const hasFormatting = files.some(f => f.path.includes('prettier')) || packageJson?.devDependencies?.prettier;
    if (!hasFormatting) {
      quickWins.push('Add Prettier for consistent code formatting');
    }

    // Missing tests
    const hasTests = files.some(f => /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f.path));
    if (!hasTests) {
      quickWins.push('Add unit tests to improve code reliability');
    }

    // Large files that could be split
    const largeFiles = files.filter(f => f.size && f.size > 100000); // > 100KB
    if (largeFiles.length > 0) {
      quickWins.push(`Split large files (${largeFiles.length} files > 100KB) into smaller modules`);
    }

    return quickWins;
  }

  // === FILE SELECTION HELPERS ===

  private static selectCriticalFiles(files: FileInfo[]): FileInfo[] {
    const critical = [
      'package.json', 'README.md', 'README.txt', '.gitignore',
      'tsconfig.json', 'next.config.js', 'next.config.ts',
      'tailwind.config.js', 'tailwind.config.ts'
    ];

    return files.filter(f => critical.includes(f.path) || critical.some(c => f.path.endsWith(`/${c}`)));
  }

  private static selectArchitecturalFiles(files: FileInfo[], analysis?: CodebaseAnalysis): FileInfo[] {
    // Entry points and main application files
    const architectural = files.filter(f =>
      /^(index|main|app|server)\.(js|ts|tsx|jsx)$/.test(f.path.split('/').pop() || '') ||
      f.path === 'app/layout.tsx' ||
      f.path === 'app/page.tsx' ||
      f.path === 'pages/_app.tsx' ||
      f.path === 'pages/index.tsx'
    );

    return architectural;
  }

  private static selectBusinessLogicFiles(files: FileInfo[]): FileInfo[] {
    return files.filter(f =>
      f.path.includes('services/') ||
      f.path.includes('business/') ||
      f.path.includes('logic/') ||
      f.path.includes('core/') ||
      f.path.includes('domain/') ||
      f.path.includes('use-cases/') ||
      f.path.includes('api/') ||
      f.path.includes('routes/')
    ).slice(0, 20); // Limit to prevent too many files
  }

  private static selectConfigurationFiles(files: FileInfo[]): FileInfo[] {
    return files.filter(f =>
      /\.config\.(js|ts|json|mjs)$/.test(f.path) ||
      f.path.includes('prisma/schema.prisma') ||
      f.path.includes('.env') ||
      f.path.includes('docker') ||
      f.path.includes('webpack') ||
      f.path.includes('babel') ||
      f.path.includes('jest')
    );
  }

  private static selectExampleFiles(files: FileInfo[]): FileInfo[] {
    return files.filter(f =>
      f.path.includes('example') ||
      f.path.includes('demo') ||
      f.path.includes('sample') ||
      /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f.path)
    ).slice(0, 8); // Limit examples
  }

  private static selectTypeDefinitions(files: FileInfo[]): FileInfo[] {
    return files.filter(f =>
      f.path.endsWith('.d.ts') ||
      f.path.includes('types/') ||
      f.path.includes('interfaces/') ||
      f.path.includes('@types/')
    );
  }

  private static shouldExcludeFromAI(path: string): boolean {
    const excludePatterns = [
      /node_modules/,
      /\.git\//,
      /dist\//,
      /build\//,
      /\.next\//,
      /coverage\//,
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf)$/i,
      /\.min\.(js|css)$/,
      /\.map$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/
    ];

    return excludePatterns.some(pattern => pattern.test(path)) ||
           (path.includes('test') && path.includes('__snapshots__'));
  }

  // === HELPER METHODS FOR PATTERN DETECTION ===

  private static findMVCFiles(files: FileInfo[]): string[] {
    return files
      .filter(f =>
        f.path.includes('controller') ||
        f.path.includes('model') ||
        f.path.includes('view')
      )
      .map(f => f.path)
      .slice(0, 10);
  }

  private static findRepositoryFiles(files: FileInfo[]): string[] {
    return files
      .filter(f => f.path.includes('repository'))
      .map(f => f.path)
      .slice(0, 10);
  }

  private static findMicroserviceFiles(files: FileInfo[]): string[] {
    return files
      .filter(f =>
        f.path.includes('service') ||
        f.path.includes('Dockerfile') ||
        f.path.includes('docker-compose')
      )
      .map(f => f.path)
      .slice(0, 10);
  }

  private static findComponentFiles(files: FileInfo[]): string[] {
    return files
      .filter(f => f.path.includes('component'))
      .map(f => f.path)
      .slice(0, 10);
  }
}