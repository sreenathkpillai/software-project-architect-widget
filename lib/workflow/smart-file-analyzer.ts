interface FileInfo {
  path: string;
  size?: number;
  type: string;
}

interface FrameworkDetection {
  framework: string;
  version?: string;
  confidence: number;
  indicators: string[];
}

interface ProjectAnalysis {
  frameworks: FrameworkDetection[];
  language: string;
  projectType: 'frontend' | 'backend' | 'fullstack' | 'library' | 'mobile' | 'unknown';
  architecture: string[];
  entryPoints: string[];
  configFiles: string[];
  keyDirectories: string[];
}

export class SmartFileAnalyzer {
  /**
   * Intelligently select the most important files for analysis
   */
  static selectImportantFiles(
    files: FileInfo[],
    preAnalysis?: { packageJson?: any; readmeContent?: string }
  ): { selectedFiles: FileInfo[]; analysis: ProjectAnalysis } {

    // Step 1: Detect frameworks and project structure
    const analysis = this.analyzeProjectStructure(files, preAnalysis);

    // Step 2: Select files based on detected frameworks and architecture
    const selectedFiles = this.selectFilesByImportance(files, analysis);

    return { selectedFiles, analysis };
  }

  /**
   * Analyze project structure to understand frameworks, architecture, etc.
   */
  private static analyzeProjectStructure(files: FileInfo[], preAnalysis?: any): ProjectAnalysis {
    const frameworks: FrameworkDetection[] = [];
    const configFiles: string[] = [];
    const entryPoints: string[] = [];
    const keyDirectories: string[] = [];

    // Extract ALL directory structure for comprehensive analysis
    const directories = new Set<string>();
    const fileExtensions = new Map<string, number>();

    files.forEach(file => {
      // Count file extensions to determine primary language
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext) {
        fileExtensions.set(ext, (fileExtensions.get(ext) || 0) + 1);
      }

      // Build complete directory tree
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        directories.add(parts.slice(0, i).join('/'));
      }
    });

    console.log('📁 Directory Analysis:', {
      totalFiles: files.length,
      totalDirectories: directories.size,
      topExtensions: Array.from(fileExtensions.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([ext, count]) => `${ext}: ${count}`)
    });

    // Detect frameworks by analyzing key files and dependencies
    frameworks.push(...this.detectNextJS(files, preAnalysis));
    frameworks.push(...this.detectReact(files, preAnalysis));
    frameworks.push(...this.detectVue(files, preAnalysis));
    frameworks.push(...this.detectNuxt(files, preAnalysis));
    frameworks.push(...this.detectSvelte(files, preAnalysis));
    frameworks.push(...this.detectExpress(files, preAnalysis));
    frameworks.push(...this.detectNestJS(files, preAnalysis));
    frameworks.push(...this.detectPrisma(files, preAnalysis));
    frameworks.push(...this.detectTailwind(files, preAnalysis));
    frameworks.push(...this.detectTypeScript(files, preAnalysis));
    frameworks.push(...this.detectCpp(files, preAnalysis));
    frameworks.push(...this.detectCSharp(files, preAnalysis));
    frameworks.push(...this.detectPython(files, preAnalysis));

    // Detect project type
    const projectType = this.detectProjectType(files, frameworks);

    // Detect language
    const language = this.detectPrimaryLanguage(files, preAnalysis);

    // Detect architecture patterns
    const architecture = this.detectArchitecture(files, directories);

    // Find entry points
    entryPoints.push(...this.findEntryPoints(files, frameworks));

    // Find config files
    configFiles.push(...this.findConfigFiles(files));

    return {
      frameworks: frameworks.sort((a, b) => b.confidence - a.confidence),
      language,
      projectType,
      architecture,
      entryPoints,
      configFiles,
      keyDirectories: Array.from(directories).slice(0, 20)
    };
  }

  /**
   * Select files based on project analysis
   */
  private static selectFilesByImportance(files: FileInfo[], analysis: ProjectAnalysis): FileInfo[] {
    const selected: FileInfo[] = [];
    const maxFiles = 20; // Focus on 20 most important files for better analysis

    // Priority 1: Critical config and meta files (always include)
    const criticalFiles = files.filter(f =>
      /^(package\.json|README\.(md|txt)|\.gitignore|LICENSE)$/i.test(f.path) ||
      analysis.configFiles.includes(f.path)
    );
    selected.push(...criticalFiles);

    // Priority 2: Entry points and main application files
    const entryFiles = files.filter(f =>
      analysis.entryPoints.some(entry => f.path.includes(entry)) ||
      /^(index|main|app|server)\.(js|ts|tsx|jsx)$/.test(f.path.split('/').pop() || '') ||
      /^(src|app|pages)\/(index|main|app)\.(js|ts|tsx|jsx)$/.test(f.path)
    );
    selected.push(...entryFiles.filter(f => !selected.includes(f)));

    // Priority 3: Framework-specific important files
    const frameworkFiles = this.selectFrameworkSpecificFiles(files, analysis);
    selected.push(...frameworkFiles.filter(f => !selected.includes(f)));

    // Priority 4: Core application logic (based on detected architecture)
    const coreFiles = this.selectCoreApplicationFiles(files, analysis);
    selected.push(...coreFiles.filter(f => !selected.includes(f)));

    // Priority 5: API routes and database schemas
    const apiFiles = files.filter(f =>
      /^(api|routes|controllers|models|schemas)\/.*\.(js|ts|tsx|jsx)$/.test(f.path) ||
      /\.(schema|model|migration)\.(js|ts|sql|prisma)$/.test(f.path)
    );
    selected.push(...apiFiles.filter(f => !selected.includes(f)));

    // Priority 6: Component architecture samples (not all components, just key ones)
    const componentSamples = this.selectComponentSamples(files, analysis);
    selected.push(...componentSamples.filter(f => !selected.includes(f)));

    // Apply size and exclusion filters
    const filtered = selected.filter(f =>
      (!f.size || f.size < 200000) && // Larger file limit for important files
      !this.isExcludedFile(f.path)
    );

    return filtered.slice(0, maxFiles);
  }

  // Framework detection methods
  private static detectNextJS(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    // Check for Next.js specific files
    if (files.some(f => /^next\.config\.(js|ts|mjs)$/.test(f.path))) {
      indicators.push('next.config file');
      confidence += 40;
    }

    if (files.some(f => f.path === 'next-env.d.ts')) {
      indicators.push('next-env.d.ts');
      confidence += 30;
    }

    // Check for App Router structure (stronger indicator)
    const appRouterFiles = files.filter(f => /^app\/.*\/(page|layout|loading|error|not-found)\.(js|ts|tsx|jsx)$/.test(f.path));
    if (appRouterFiles.length > 0) {
      indicators.push(`App Router (${appRouterFiles.length} files)`);
      confidence += 35;
    }

    // Check for Pages Router
    const pagesRouterFiles = files.filter(f => /^pages\/.*\.(js|ts|tsx|jsx)$/.test(f.path));
    if (pagesRouterFiles.length > 0) {
      indicators.push(`Pages Router (${pagesRouterFiles.length} files)`);
      confidence += 25;
    }

    // Check for Next.js specific directories
    if (files.some(f => f.path.startsWith('public/'))) {
      indicators.push('public directory');
      confidence += 10;
    }

    // Check package.json dependencies
    if (preAnalysis?.packageJson?.dependencies?.next || preAnalysis?.packageJson?.devDependencies?.next) {
      indicators.push('Next.js dependency');
      confidence += 35;
    }

    // Check for typical Next.js scripts
    const scripts = preAnalysis?.packageJson?.scripts || {};
    if (scripts.dev?.includes('next') || scripts.build?.includes('next')) {
      indicators.push('Next.js scripts');
      confidence += 20;
    }

    if (confidence > 25) {
      return [{
        framework: 'Next.js',
        confidence: Math.min(confidence, 100),
        indicators
      }];
    }
    return [];
  }

  private static detectReact(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    // Count React component files
    const reactFiles = files.filter(f => /\.(jsx|tsx)$/.test(f.path));
    if (reactFiles.length > 0) {
      indicators.push(`${reactFiles.length} JSX/TSX files`);
      confidence += Math.min(reactFiles.length * 5, 30);
    }

    // Check for typical React directories
    if (files.some(f => f.path.startsWith('src/components/'))) {
      indicators.push('components directory');
      confidence += 20;
    }

    if (files.some(f => f.path.startsWith('src/hooks/'))) {
      indicators.push('hooks directory');
      confidence += 15;
    }

    // Check package.json
    if (preAnalysis?.packageJson?.dependencies?.react) {
      indicators.push('React dependency');
      confidence += 40;
    }

    // Check for Create React App structure
    if (files.some(f => f.path === 'public/index.html') && files.some(f => f.path.includes('src/index'))) {
      indicators.push('Create React App structure');
      confidence += 25;
    }

    // Check for Vite React setup
    if (files.some(f => f.path === 'vite.config.js' || f.path === 'vite.config.ts')) {
      indicators.push('Vite React setup');
      confidence += 20;
    }

    if (confidence > 20) {
      return [{
        framework: 'React',
        confidence: Math.min(confidence, 100),
        indicators
      }];
    }
    return [];
  }

  private static detectPrisma(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    if (files.some(f => f.path.includes('prisma/schema.prisma'))) {
      indicators.push('Prisma schema');
      confidence += 50;
    }

    if (files.some(f => f.path.includes('prisma/migrations'))) {
      indicators.push('Prisma migrations');
      confidence += 30;
    }

    if (preAnalysis?.packageJson?.dependencies?.['@prisma/client']) {
      indicators.push('Prisma client dependency');
      confidence += 40;
    }

    if (confidence > 25) {
      return [{
        framework: 'Prisma',
        confidence,
        indicators
      }];
    }
    return [];
  }

  // Additional framework detection methods
  private static detectVue(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    const vueFiles = files.filter(f => f.path.endsWith('.vue'));
    if (vueFiles.length > 0) {
      indicators.push(`${vueFiles.length} Vue files`);
      confidence += Math.min(vueFiles.length * 10, 40);
    }

    if (preAnalysis?.packageJson?.dependencies?.vue || preAnalysis?.packageJson?.devDependencies?.vue) {
      indicators.push('Vue dependency');
      confidence += 35;
    }

    return confidence > 20 ? [{ framework: 'Vue.js', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectExpress(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    if (preAnalysis?.packageJson?.dependencies?.express) {
      indicators.push('Express dependency');
      confidence += 40;
    }

    const serverFiles = files.filter(f => /^(server|app|index)\.(js|ts)$/.test(f.path));
    if (serverFiles.length > 0) {
      indicators.push('Server files detected');
      confidence += 20;
    }

    if (files.some(f => f.path.startsWith('routes/') || f.path.startsWith('middleware/'))) {
      indicators.push('Express-like structure');
      confidence += 15;
    }

    return confidence > 25 ? [{ framework: 'Express.js', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectTailwind(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    if (files.some(f => f.path === 'tailwind.config.js' || f.path === 'tailwind.config.ts')) {
      indicators.push('Tailwind config');
      confidence += 50;
    }

    if (preAnalysis?.packageJson?.dependencies?.tailwindcss || preAnalysis?.packageJson?.devDependencies?.tailwindcss) {
      indicators.push('Tailwind dependency');
      confidence += 40;
    }

    return confidence > 30 ? [{ framework: 'Tailwind CSS', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectTypeScript(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    const tsFiles = files.filter(f => /\.(ts|tsx)$/.test(f.path));
    if (tsFiles.length > 0) {
      indicators.push(`${tsFiles.length} TypeScript files`);
      confidence += Math.min(tsFiles.length * 3, 30);
    }

    if (files.some(f => f.path === 'tsconfig.json')) {
      indicators.push('tsconfig.json');
      confidence += 40;
    }

    if (preAnalysis?.packageJson?.devDependencies?.typescript) {
      indicators.push('TypeScript dependency');
      confidence += 30;
    }

    return confidence > 25 ? [{ framework: 'TypeScript', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectCpp(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    const cppFiles = files.filter(f => /\.(cpp|c|cxx|cc)$/.test(f.path));
    const headerFiles = files.filter(f => /\.(h|hpp|hxx)$/.test(f.path));

    if (cppFiles.length > 0) {
      indicators.push(`${cppFiles.length} C++ source files`);
      confidence += Math.min(cppFiles.length * 5, 40);
    }

    if (headerFiles.length > 0) {
      indicators.push(`${headerFiles.length} header files`);
      confidence += Math.min(headerFiles.length * 3, 30);
    }

    if (files.some(f => f.path === 'CMakeLists.txt')) {
      indicators.push('CMake build system');
      confidence += 30;
    }

    if (files.some(f => /\.(sln|vcxproj)$/.test(f.path))) {
      indicators.push('Visual Studio solution');
      confidence += 25;
    }

    if (files.some(f => f.path === 'Makefile')) {
      indicators.push('Makefile build system');
      confidence += 20;
    }

    return confidence > 20 ? [{ framework: 'C++', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectCSharp(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    const csFiles = files.filter(f => f.path.endsWith('.cs'));
    if (csFiles.length > 0) {
      indicators.push(`${csFiles.length} C# files`);
      confidence += Math.min(csFiles.length * 8, 40);
    }

    if (files.some(f => /\.(csproj|sln)$/.test(f.path))) {
      indicators.push('.NET project files');
      confidence += 40;
    }

    return confidence > 30 ? [{ framework: 'C#/.NET', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectPython(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] {
    const indicators: string[] = [];
    let confidence = 0;

    const pyFiles = files.filter(f => f.path.endsWith('.py'));
    if (pyFiles.length > 0) {
      indicators.push(`${pyFiles.length} Python files`);
      confidence += Math.min(pyFiles.length * 5, 30);
    }

    if (files.some(f => f.path === 'requirements.txt')) {
      indicators.push('requirements.txt');
      confidence += 25;
    }

    if (files.some(f => f.path === 'setup.py')) {
      indicators.push('setup.py');
      confidence += 20;
    }

    return confidence > 20 ? [{ framework: 'Python', confidence: Math.min(confidence, 100), indicators }] : [];
  }

  private static detectNuxt(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] { return []; }
  private static detectSvelte(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] { return []; }
  private static detectNestJS(files: FileInfo[], preAnalysis?: any): FrameworkDetection[] { return []; }

  private static detectProjectType(files: FileInfo[], frameworks: FrameworkDetection[]): 'frontend' | 'backend' | 'fullstack' | 'library' | 'mobile' | 'unknown' {
    const hasNext = frameworks.some(f => f.framework === 'Next.js');
    const hasReact = frameworks.some(f => f.framework === 'React');
    const hasPrisma = frameworks.some(f => f.framework === 'Prisma');
    const hasApi = files.some(f => f.path.includes('/api/') || f.path.includes('/routes/'));
    const hasCpp = frameworks.some(f => f.framework === 'C++');
    const hasCSharp = frameworks.some(f => f.framework === 'C#/.NET');
    const hasPython = frameworks.some(f => f.framework === 'Python');

    // Native/Desktop applications
    if (hasCpp || hasCSharp) return 'backend'; // Could be desktop app, but backend is closest category

    // Web applications
    if (hasNext || (hasReact && hasApi && hasPrisma)) return 'fullstack';
    if (hasReact || files.some(f => f.path.includes('public/index.html'))) return 'frontend';
    if (hasApi || hasPrisma) return 'backend';

    // Python could be various things
    if (hasPython) {
      if (files.some(f => f.path.includes('flask') || f.path.includes('django') || f.path.includes('fastapi'))) {
        return 'backend';
      }
      return 'unknown'; // Could be script, library, etc.
    }

    return 'unknown';
  }

  private static detectPrimaryLanguage(files: FileInfo[], preAnalysis?: any): string {
    const extensions = files.map(f => f.path.split('.').pop()?.toLowerCase()).filter(Boolean);
    const counts: Record<string, number> = {};

    extensions.forEach(ext => {
      if (ext && ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs'].includes(ext)) {
        counts[ext] = (counts[ext] || 0) + 1;
      }
    });

    const primary = Object.entries(counts).sort(([,a], [,b]) => b - a)[0];

    if (primary?.[0] === 'ts' || primary?.[0] === 'tsx') return 'TypeScript';
    if (primary?.[0] === 'js' || primary?.[0] === 'jsx') return 'JavaScript';
    if (primary?.[0] === 'py') return 'Python';

    return 'JavaScript'; // Default
  }

  private static detectArchitecture(files: FileInfo[], directories: Set<string>): string[] {
    const patterns = [];

    if (directories.has('src/components') && directories.has('src/pages')) {
      patterns.push('Component-based architecture');
    }

    if (directories.has('api') || directories.has('src/api')) {
      patterns.push('API-based');
    }

    if (directories.has('lib') || directories.has('src/lib')) {
      patterns.push('Library structure');
    }

    return patterns;
  }

  private static findEntryPoints(files: FileInfo[], frameworks: FrameworkDetection[]): string[] {
    const entryPoints = [];

    // Next.js specific entry points
    if (frameworks.some(f => f.framework === 'Next.js')) {
      entryPoints.push('app/layout.tsx', 'app/page.tsx', 'pages/_app.tsx', 'pages/index.tsx');
    }

    // General entry points
    entryPoints.push('src/index.ts', 'src/index.js', 'src/main.ts', 'index.js', 'server.js', 'app.js');

    return entryPoints.filter(entry => files.some(f => f.path === entry));
  }

  private static findConfigFiles(files: FileInfo[]): string[] {
    const configPatterns = [
      /^(next|vite|webpack|rollup|babel)\.config\.(js|ts|mjs|json)$/,
      /^(tsconfig|jsconfig)\.json$/,
      /^tailwind\.config\.(js|ts)$/,
      /^(prisma\/schema\.prisma|schema\.prisma)$/,
      /^\.env(\.example|\.local)?$/,
      /^docker-compose\.ya?ml$/,
      /^Dockerfile$/
    ];

    return files
      .filter(f => configPatterns.some(pattern => pattern.test(f.path)))
      .map(f => f.path);
  }

  private static selectFrameworkSpecificFiles(files: FileInfo[], analysis: ProjectAnalysis): FileInfo[] {
    const frameworkFiles: FileInfo[] = [];

    // Next.js specific files
    if (analysis.frameworks.some(f => f.framework === 'Next.js')) {
      frameworkFiles.push(...files.filter(f =>
        /^app\/(layout|page|loading|error|not-found)\.(js|ts|tsx|jsx)$/.test(f.path) ||
        /^pages\/_app\.(js|ts|tsx|jsx)$/.test(f.path) ||
        /^pages\/index\.(js|ts|tsx|jsx)$/.test(f.path) ||
        /^middleware\.(js|ts)$/.test(f.path)
      ));
    }

    // Prisma specific files
    if (analysis.frameworks.some(f => f.framework === 'Prisma')) {
      frameworkFiles.push(...files.filter(f =>
        f.path.includes('prisma/') ||
        f.path.includes('migrations/')
      ));
    }

    return frameworkFiles;
  }

  private static selectCoreApplicationFiles(files: FileInfo[], analysis: ProjectAnalysis): FileInfo[] {
    // DISCOVER directories dynamically instead of assuming structure
    const allDirectories = new Set<string>();
    files.forEach(file => {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        allDirectories.add(parts.slice(0, i).join('/'));
      }
    });

    console.log('📁 All directories found:', Array.from(allDirectories).slice(0, 20));

    // Find directories that look like application code
    const appLikeDirs = Array.from(allDirectories).filter(dir => {
      const dirName = dir.toLowerCase();
      return (
        dirName.includes('app') || dirName.includes('src') ||
        dirName.includes('lib') || dirName.includes('component') ||
        dirName.includes('service') || dirName.includes('util') ||
        dirName.includes('hook') || dirName.includes('api') ||
        dirName.includes('page') || dirName.includes('view') ||
        dirName.includes('config') || dirName.includes('type')
      );
    });

    console.log('🎯 App-like directories:', appLikeDirs);

    const coreFiles: FileInfo[] = [];

    // For each app-like directory, find ALL files recursively within it
    appLikeDirs.forEach(dir => {
      // Get ALL files that start with this directory path (including subdirectories)
      const allDirFiles = files.filter(f => f.path.startsWith(dir + '/'));

      // Filter to actual source code files (not config files)
      const sourceFiles = allDirFiles.filter(f => {
        const ext = f.path.split('.').pop()?.toLowerCase();
        const isSourceCode = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'hpp', 'cs', 'swift', 'kt'].includes(ext || '');
        const isNotTest = !f.path.includes('.test.') && !f.path.includes('.spec.');
        const isNotConfig = !/(config|setup|jest|eslint)/.test(f.path.split('/').pop() || '');

        return isSourceCode && isNotTest && isNotConfig;
      });

      console.log(`📂 ${dir}: found ${allDirFiles.length} total files, ${sourceFiles.length} source files`);

      if (sourceFiles.length === 0) return;

      // Take samples from source files, prioritizing important ones
      const samples = sourceFiles
        .sort((a, b) => {
          // Prioritize key files like index, main, app
          const aIsKey = /\/(index|main|app|server|program)\.(js|ts|tsx|jsx|py|cpp|c|cs)$/.test(a.path);
          const bIsKey = /\/(index|main|app|server|program)\.(js|ts|tsx|jsx|py|cpp|c|cs)$/.test(b.path);

          if (aIsKey && !bIsKey) return -1;
          if (!aIsKey && bIsKey) return 1;

          // Then by depth (prefer files closer to app root)
          const aDepth = a.path.split('/').length;
          const bDepth = b.path.split('/').length;
          return aDepth - bDepth;
        })
        .slice(0, 4); // Take top 4 source files from each app

      console.log(`📝 Selected from ${dir}:`, samples.map(f => f.path));
      coreFiles.push(...samples);
    });

    // FALLBACK: If no app-like directories found source files, scan root directory
    if (coreFiles.length === 0) {
      console.log('🔍 No source files found in app-like directories, scanning root...');

      const rootSourceFiles = files.filter(f => {
        // Only files directly in root (no subdirectories)
        if (f.path.includes('/')) return false;

        const ext = f.path.split('.').pop()?.toLowerCase();
        const isSourceCode = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'hpp', 'cs', 'swift', 'kt'].includes(ext || '');
        const isProjectFile = ['sln', 'csproj', 'vcxproj', 'pro', 'xcodeproj'].includes(ext || '');
        const isNotTest = !f.path.includes('.test.') && !f.path.includes('.spec.');

        return (isSourceCode || isProjectFile) && isNotTest;
      });

      console.log(`📂 Root directory: found ${rootSourceFiles.length} source/project files`);

      if (rootSourceFiles.length > 0) {
        // For root files, prioritize main entry points and important project files
        const rootSamples = rootSourceFiles
          .sort((a, b) => {
            // Prioritize main files and project files
            const aIsMain = /^(main|program|app|index)\.(cpp|c|cs|py|js)$/.test(a.path);
            const bIsMain = /^(main|program|app|index)\.(cpp|c|cs|py|js)$/.test(b.path);
            const aIsProject = /\.(sln|csproj|vcxproj)$/.test(a.path);
            const bIsProject = /\.(sln|csproj|vcxproj)$/.test(b.path);

            if (aIsMain && !bIsMain) return -1;
            if (!aIsMain && bIsMain) return 1;
            if (aIsProject && !bIsProject) return -1;
            if (!aIsProject && bIsProject) return 1;

            return a.path.localeCompare(b.path);
          })
          .slice(0, 8); // Take more samples from root since it's the main location

        console.log(`📝 Selected from root:`, rootSamples.map(f => f.path));
        coreFiles.push(...rootSamples);
      }
    }

    // Also add any root-level important files
    const rootFiles = files.filter(f =>
      !f.path.includes('/') &&
      ['js', 'ts', 'py', 'go', 'rs', 'java'].includes(f.path.split('.').pop()?.toLowerCase() || '')
    );
    coreFiles.push(...rootFiles);

    console.log('🎯 Core files selected:', coreFiles.map(f => f.path));
    return coreFiles.slice(0, 10); // Limit to 10 core files
  }

  private static selectComponentSamples(files: FileInfo[], analysis: ProjectAnalysis): FileInfo[] {
    // Look for component-like files in any directory structure
    const componentFiles = files.filter(f => {
      const path = f.path.toLowerCase();
      const ext = f.path.split('.').pop()?.toLowerCase();
      return (
        ['tsx', 'jsx', 'ts', 'js', 'vue', 'svelte'].includes(ext || '') &&
        (path.includes('component') || path.includes('ui') || path.includes('widget')) &&
        !f.path.includes('.test.') && !f.path.includes('.spec.')
      );
    });

    if (componentFiles.length === 0) {
      // Fallback: look for React-like files
      const reactLikeFiles = files.filter(f => {
        const ext = f.path.split('.').pop()?.toLowerCase();
        return ['tsx', 'jsx'].includes(ext || '') &&
               !f.path.includes('.test.') && !f.path.includes('.spec.');
      });
      return reactLikeFiles.slice(0, 3);
    }

    // Select diverse samples
    const samples = componentFiles
      .sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        return aDepth - bDepth; // Prefer simpler paths
      })
      .slice(0, 5);

    console.log('🧩 Component samples:', samples.map(f => f.path));
    return samples;
  }

  private static isExcludedFile(path: string): boolean {
    const excludePatterns = [
      /node_modules/,
      /\.git\//,
      /dist\//,
      /build\//,
      /\.next\//,
      /coverage\//,
      /\.(test|spec)\.(js|ts|tsx|jsx)$/,
      /__tests__/,
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf)$/i,
      /\.min\.(js|css)$/,
      /\.map$/,
      /\.lock$/
    ];

    return excludePatterns.some(pattern => pattern.test(path));
  }
}